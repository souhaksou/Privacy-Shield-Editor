import type { OcrWord } from "@/types/ocr";
import type { MappedPiiMatch, WordRange } from "@/types/mask";
import type { PiiMatch } from "@/types/pii";

/**
 * 將字詞做最小正規化，用於 fallback 比對。
 *
 * @param s 原始字詞
 * @returns 正規化後字串（統一 dash、空白並移除前後空白）
 */
function normalizeStr(s: string): string {
  return s.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

/**
 * 對全文做正規化，並保留 normalized 字元到原文索引的映射。
 *
 * @param s 原始全文字串
 * `indexMap[i]` 代表 `normalized[i]` 對應到原始 `text` 的字元位置。
 * @returns 正規化結果與字元索引映射表
 */
function normalizeWithIndexMap(s: string): { normalized: string; indexMap: number[] } {
  let normalized = "";
  const indexMap: number[] = [];

  for (let i = 0; i < s.length; i += 1) {
    const char = s[i] ?? "";

    if (/[–—]/.test(char)) {
      normalized += "-";
      indexMap.push(i);
      continue;
    }

    if (/\s/.test(char)) {
      if (normalized.length === 0 || normalized[normalized.length - 1] === " ") {
        continue;
      }

      normalized += " ";
      indexMap.push(i);
      continue;
    }

    normalized += char;
    indexMap.push(i);
  }

  const start = 0;

  let end = normalized.length;
  while (end > start && normalized[end - 1] === " ") {
    end -= 1;
  }

  return {
    normalized: normalized.slice(start, end),
    indexMap: indexMap.slice(start, end),
  };
}

/**
 * 將原文座標前進量同步為 normalized 文字座標。
 *
 * @param indexMap normalized 到原文的字元映射表
 * @param normalizedLength normalized 字串長度
 * @param originalTarget 目標原文索引（exclusive）
 * @returns 對應可用的 normalized 起始搜尋位置
 */
function findNormCursor(indexMap: number[], normalizedLength: number, originalTarget: number): number {
  for (let pos = 0; pos < normalizedLength; pos += 1) {
    const originalIndex = indexMap[pos];
    if (originalIndex === undefined) continue;
    if (originalIndex >= originalTarget) {
      return pos;
    }
  }

  return normalizedLength;
}

/**
 * 依 OCR words 順序，將字詞對齊到全文字串索引範圍。
 *
 * 對齊策略採最小可用版本：
 * - 以 cursor 往後尋找，避免命中前文同字詞
 * - 找不到時再嘗試 trim / normalize fallback
 *
 * @param text OCR 或使用者編輯後全文
 * @param words OCR word-level 清單
 * @returns 對齊後 word ranges 與無法對齊字詞數量
 */
function buildWordRanges(
  text: string,
  words: OcrWord[],
): { ranges: WordRange[]; skippedCount: number } {
  if (!text || words.length === 0) {
    return { ranges: [], skippedCount: 0 };
  }

  const ranges: WordRange[] = [];
  let skippedCount = 0;
  let cursor = 0;
  const { normalized: normText, indexMap: textIndexMap } = normalizeWithIndexMap(text);
  const normTextLower = normText.toLowerCase();
  let normCursor = 0;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (!word) continue;

    const rawWordText = word.text ?? "";
    if (!rawWordText) continue;
    if (!rawWordText.trim()) continue;

    let searchText = rawWordText;
    let start = text.indexOf(searchText, cursor);
    let end = -1;

    if (start >= 0) {
      end = start + searchText.length;
      normCursor = findNormCursor(textIndexMap, normText.length, end);
    } else {
      const trimmed = rawWordText.trim();
      if (trimmed) {
        searchText = trimmed;
        start = text.indexOf(searchText, cursor);
      }

      if (start >= 0) {
        end = start + searchText.length;
        normCursor = findNormCursor(textIndexMap, normText.length, end);
      } else {
        const normWord = normalizeStr(rawWordText).toLowerCase();
        if (!normWord) {
          skippedCount += 1;
          continue;
        }

        let normStart = normTextLower.indexOf(normWord, normCursor);
        while (normStart >= 0 && (textIndexMap[normStart] ?? -1) < cursor) {
          normStart = normTextLower.indexOf(normWord, normStart + 1);
        }

        if (normStart < 0) {
          skippedCount += 1;
          continue;
        }

        const origStart = textIndexMap[normStart];
        const normEnd = normStart + normWord.length;
        const lastNormIndex = normEnd - 1;
        const origLastIndex = textIndexMap[lastNormIndex];

        if (origStart === undefined || origLastIndex === undefined) {
          skippedCount += 1;
          continue;
        }

        start = origStart;
        end = origLastIndex + 1;
        searchText = text.slice(start, end);
        normCursor = normEnd;
      }
    }

    if (end <= start) {
      skippedCount += 1;
      continue;
    }

    ranges.push({
      wordIndex: i,
      text: searchText,
      start,
      end,
      bbox: word.bbox,
    });

    cursor = end;
  }

  return { ranges, skippedCount };
}

/**
 * 判斷兩個半開區間是否重疊。
 *
 * @param aStart 區間 A 起點（含）
 * @param aEnd 區間 A 終點（不含）
 * @param bStart 區間 B 起點（含）
 * @param bEnd 區間 B 終點（不含）
 * @returns 兩區間有交集時為 `true`
 */
function hasOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * 將文字命中結果映射為 OCR word-level bbox 群組。
 *
 * @param text OCR 或使用者編輯後全文
 * @param words OCR word-level 清單
 * @param matches regex 偵測得到的 PII 命中
 * @param onStats 回傳本次 mapping 的跳過與未映射統計
 * @returns 每個 match 對應的字詞與 bbox 群組
 */
export function mapMatchesToBboxes(
  text: string,
  words: OcrWord[],
  matches: PiiMatch[],
  onStats?: (s: { skippedWords: number; unmappedMatches: number }) => void,
): MappedPiiMatch[] {
  if (!text || words.length === 0 || matches.length === 0) {
    onStats?.({ skippedWords: 0, unmappedMatches: 0 });
    return [];
  }

  const { ranges: wordRanges, skippedCount } = buildWordRanges(text, words);

  const mappedResults = matches.map((match) => {
    const mappedWords = wordRanges.filter((wordRange) =>
      hasOverlap(match.start, match.end, wordRange.start, wordRange.end),
    );

    return {
      match,
      words: mappedWords,
    };
  });

  const unmappedMatches = mappedResults.filter((mapped) => mapped.words.length === 0).length;
  onStats?.({ skippedWords: skippedCount, unmappedMatches });

  return mappedResults;
}
