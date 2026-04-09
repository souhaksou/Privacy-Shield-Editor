import type { PiiMatch, PiiType } from "@/types/pii";

/** 單一偵測規則的型別定義。 */
interface PiiRule {
  type: PiiType;
  regex: RegExp;
}

/** MVP 階段採用的預設 PII 偵測規則。 */
const PII_RULES: PiiRule[] = [
  {
    type: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "phone",
    regex: /(?:(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4})/g,
  },
  {
    type: "creditCard",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
  },
];

/**
 * 以 regex 規則偵測文字中的 PII。
 *
 * @param text OCR 或編輯後的全文字串
 * @returns 命中結果（依 start/end 穩定排序）
 */
export function detectPii(text: string): PiiMatch[] {
  if (!text) return [];

  const matches: PiiMatch[] = [];

  for (const rule of PII_RULES) {
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      matches.push({
        type: rule.type,
        text: value,
        start,
        end,
      });

      // 防止零長度命中造成無限迴圈（保險措施）。
      if (match.index === rule.regex.lastIndex) {
        rule.regex.lastIndex += 1;
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start || a.end - b.end);
}
