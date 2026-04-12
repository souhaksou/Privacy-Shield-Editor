import { describe, it, expect } from "vitest";
import { detectPii } from "./detect";

describe("detectPii", () => {
  it("空字串回傳空陣列", () => {
    expect(detectPii("")).toEqual([]);
  });

  it("無 PII 文字回傳空陣列", () => {
    expect(detectPii("This is a normal sentence with no PII.")).toEqual([]);
  });

  describe("email", () => {
    it("偵測標準 email", () => {
      const result = detectPii("請聯絡 user@example.com 取得協助");
      expect(result).toHaveLength(1);
      const match = result[0]!;
      expect(match.type).toBe("email");
      expect(match.text).toBe("user@example.com");
    });

    it("偵測多個 email", () => {
      const result = detectPii("a@a.com 和 b@b.org");
      expect(result.filter((m) => m.type === "email")).toHaveLength(2);
    });
  });

  describe("phone", () => {
    it("偵測台灣手機號碼格式", () => {
      const result = detectPii("電話：0912-345-678");
      const phones = result.filter((m) => m.type === "phone");
      expect(phones.length).toBeGreaterThan(0);
    });

    it("偵測國際格式電話", () => {
      const result = detectPii("+886 912 345 678");
      const phones = result.filter((m) => m.type === "phone");
      expect(phones.length).toBeGreaterThan(0);
    });
  });

  describe("creditCard", () => {
    it("偵測 16 位信用卡號", () => {
      const result = detectPii("卡號：4111 1111 1111 1111");
      const cards = result.filter((m) => m.type === "creditCard");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it("結果依 start 位置排序", () => {
    const result = detectPii("info@example.com 0912345678");
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.start).toBeGreaterThanOrEqual(result[i - 1]!.start);
    }
  });

  it("回傳正確的 start / end 索引", () => {
    const text = "Email: foo@bar.com end";
    const result = detectPii(text);
    const email = result.find((m) => m.type === "email");
    expect(email).toBeDefined();
    expect(text.slice(email!.start, email!.end)).toBe(email!.text);
  });
});
