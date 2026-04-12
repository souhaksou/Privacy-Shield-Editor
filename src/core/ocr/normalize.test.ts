import { describe, it, expect } from "vitest";
import { normalizeOcrResult } from "./normalize";

describe("normalizeOcrResult", () => {
  it("空 words 與 text 回傳乾淨結構", () => {
    const result = normalizeOcrResult({ text: "", words: [] });
    expect(result.text).toBe("");
    expect(result.words).toEqual([]);
  });

  it("text 會 trim", () => {
    const result = normalizeOcrResult({ text: "  hello world  ", words: [] });
    expect(result.text).toBe("hello world");
  });

  it("過濾空字詞", () => {
    const result = normalizeOcrResult({
      text: "hello",
      words: [
        { text: "hello", confidence: 90, bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } },
        { text: "   ", confidence: 80, bbox: { x0: 55, y0: 0, x1: 80, y1: 20 } },
        { text: "", confidence: 70, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
      ],
    });
    expect(result.words).toHaveLength(1);
    expect(result.words[0]!.text).toBe("hello");
  });

  it("bbox 轉換為 x/y/width/height（非負值）", () => {
    const result = normalizeOcrResult({
      text: "hi",
      words: [{ text: "hi", confidence: 95, bbox: { x0: 10, y0: 20, x1: 60, y1: 50 } }],
    });
    const w = result.words[0]!;
    expect(w.bbox).toEqual({ x: 10, y: 20, width: 50, height: 30 });
  });

  it("bbox x1 < x0 時 width 為 0", () => {
    const result = normalizeOcrResult({
      text: "hi",
      words: [{ text: "hi", confidence: 80, bbox: { x0: 50, y0: 0, x1: 10, y1: 20 } }],
    });
    expect(result.words[0]!.bbox.width).toBe(0);
  });

  it("confidence 非數值時 fallback 為 0", () => {
    const result = normalizeOcrResult({
      text: "hi",
      words: [{ text: "hi", confidence: NaN, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }],
    });
    expect(result.words[0]!.confidence).toBe(0);
  });

  it("缺少 bbox 欄位時使用 0 作預設", () => {
    const result = normalizeOcrResult({
      text: "hi",
      words: [{ text: "hi", confidence: 80, bbox: {} as never }],
    });
    const bbox = result.words[0]!.bbox;
    expect(bbox.x).toBe(0);
    expect(bbox.y).toBe(0);
    expect(bbox.width).toBe(0);
    expect(bbox.height).toBe(0);
  });
});
