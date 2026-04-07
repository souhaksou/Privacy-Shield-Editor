---
name: jsdoc-comments-zh
description: Write and refine Chinese code comments in JSDoc-first style for specified files. Use when user asks to add comments, rewrite comments, or standardize documentation style without changing logic.
---

# JSDoc 中文註解助手

## 何時使用

當使用者明確要求以下任一情境時使用：

- 在指定檔案補註解
- 把既有註解改成 JSDoc 風格
- 統一註解語言為中文
- 只調整可讀性，不改程式邏輯

若使用者未指定檔案，先詢問要處理的路徑範圍。

## 核心原則

1. 只改註解，不改程式行為與 API 介面。
2. 以 JSDoc 為主：優先放在 `function`、`type`、`interface`、`class` 上方。
3. 內嵌註解只留在複雜邏輯（防呆、轉換規則、邊界條件）。
4. 註解重點是「為什麼」，避免逐行翻譯程式碼。
5. 註解語言使用繁體中文，術語可保留英文（例如 `OCR`, `bbox`, `store`）。

## 執行步驟

1. 讀取使用者指定檔案，先辨識公開符號與複雜邏輯區塊。
2. 為公開函式補齊 JSDoc：
   - 至少包含用途敘述
   - 有參數時使用 `@param`
   - 有回傳值時使用 `@returns`
3. 為重要型別補短 JSDoc，說明該型別在模組中的角色。
4. 刪除冗長或重複的行內註解，只保留必要說明。
5. 確認沒有改到邏輯、型別語意或資料流程。

## 推薦格式

```ts
/**
 * 將外部原始資料轉成專案標準格式。
 *
 * @param input 外部來源資料，允許部分欄位缺失
 * @returns 可直接提供給 UI 或 store 的穩定結構
 */
export function transform(input: RawData): NormalizedData {
  // 無效值回退，避免 NaN 汙染狀態層。
  // ...logic
}
```

```ts
/** OCR 單字資訊（文字、信心分數、定位框）。 */
export interface OcrWord {
  text: string;
  confidence: number;
  bbox: OcrBBox;
}
```

## 不要做的事

- 不要在每一行都加註解。
- 不要用註解重述明顯程式碼（例如「把值指定給變數」）。
- 不要在未被要求時重構函式或改名。
- 不要加入與現況不一致的註解（避免過時文件）。

## 交付檢查清單

- [ ] 主要函式有 JSDoc，且含 `@param` / `@returns`（適用時）
- [ ] 重要型別有一句話角色說明
- [ ] 複雜邏輯有少量行內註解
- [ ] 已移除冗餘註解
- [ ] 程式邏輯與行為完全未變
