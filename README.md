# Privacy-Shield-Editor

Privacy-Shield-Editor 是一個**純前端（client-side）**的 OCR 文件處理工具，專注在「辨識 + 去識別化 + 匯出」流程。

使用者可以上傳文件影像，在瀏覽器中完成 OCR、校對文字、選擇是否進行 PII（個資）遮罩，最後匯出 PNG 或 PDF。

## Why This Project

- 保護隱私：文件資料不需上傳到後端服務處理
- OCR-first：以 OCR 為核心，PII 遮罩為可選後處理
- 實用導向：流程固定且清楚，避免過度複雜的多模式切換

## Features

- 上傳文件影像並在瀏覽器中執行 OCR
- 支援 OCR 結果檢視與手動修正
- 可選擇啟用 PII 偵測（email / phone / credit card）
- 自動產生遮罩區塊，並支援手動新增、移動、縮放、刪除
- 每個遮罩可獨立設定填色與邊框色
- 匯出 PNG 與 PDF（遮罩結果一致）
- OCR 語言可組合選擇：`eng` / `chi_tra`

## Core Workflow

本專案使用單一路徑流程：

1. Upload image
2. OCR recognition
3. Review / edit OCR result
4. Optional PII masking
5. Export as PNG or PDF

> 設計原則：OCR 是核心，PII 為可選，匯出永遠在最後。

## Privacy Statement

- 所有核心處理在前端完成
- 不依賴後端 OCR 服務
- 不以本專案流程主動上傳文件內容

## Tech Stack

- Vite
- Vue 3 (Composition API)
- TypeScript
- PrimeVue
- TailwindCSS
- Pinia
- Tesseract.js
- pdf-lib
- Canvas API
- Web Worker

## Project Status

目前狀態：**Active maintenance（Phase 1–5 baseline completed）**

已完成：

- OCR 基礎流程
- PNG / PDF 匯出
- PII 偵測與遮罩資料流
- 三層 Canvas（base / mask / ui）互動
- 遮罩移動、縮放、顏色設定
- OCR 語言選擇（`eng` / `chi_tra`）

## Getting Started

### Requirements

- Node.js: `^20.19.0 || >=22.12.0`

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

### Test

```bash
npm run test
```

## Architecture Notes

專案維持分層結構：

- `src/core`: 純邏輯（OCR 正規化、PII 規則、匯出工具）
- `src/composables`: Vue 邏輯層（OCR、Canvas 互動、匯出流程）
- `src/components`: UI 顯示層（避免塞入業務邏輯）
- `src/workers`: OCR worker
- `src/stores`: Pinia 狀態管理

詳細設計與決策可參考：

- `docs/INFO.md`
- `docs/PROGRESS.md`

## Known Limitations

- OCR 準確率受影像品質影響
- PII 偵測屬於規則式輔助，仍需人工檢查
- 目前以影像型 PDF 匯出為主

## License

尚未指定 License（可依團隊需求補上 `LICENSE` 檔案）。
