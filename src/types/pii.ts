/** 支援的 PII 類型。 */
export type PiiType = "email" | "phone" | "creditCard";

/** 單一 PII 命中結果（以原始文字索引定位）。 */
export interface PiiMatch {
  type: PiiType;
  text: string;
  start: number;
  end: number;
}
