---
name: ui canvas polish phase
overview: 規劃下一步 UI + Canvas 打磨：優化 OCR 頁面排版，並新增既有遮罩框可拖曳移動、四角縮放，以及每個遮罩可獨立設定填色/邊線色且顏色會套用到匯出。
todos:
  - id: model-mask-color-update
    content: 擴充遮罩型別與 store 單筆更新 API（含預設 fill/stroke 顏色）
    status: completed
  - id: canvas-move-resize
    content: 在 useCanvasEditor 實作既有遮罩 hit-test、拖曳移動、四角縮放與邊界裁切
    status: completed
  - id: panel-color-controls
    content: 在 OcrPiiPanel 新增每筆遮罩的填色/邊線 color 控制並接線到 OcrFlowView
    status: pending
  - id: render-export-color-sync
    content: 同步更新 preview drawMasks 與 export buildMaskCanvas，讓顏色一致套用
    status: pending
  - id: layout-polish-ocr-flow
    content: 調整 OcrFlowView + OcrCanvasEditor + OcrPiiPanel 的版面、間距與視覺層次
    status: pending
  - id: validation-pass
    content: 執行 type-check/build/eslint 與手動 E2E 驗收（含 move/resize/color/export）
    status: pending
isProject: false
---

# UI + Canvas 打磨計畫

## 目標

- 改善 OCR 流程頁整體排版與視覺層次（保留既有 OCR-first 流程與分層架構）。
- 讓「已存在」遮罩框可在 canvas 上直接互動：
  - 拖曳四角調整大小（Adobe 常見框選手感）
  - 拖曳框內移動整個框
- 每個遮罩可獨立設定顏色：填色與邊線色可分開設定，且你已確認顏色要套用到 PNG/PDF 匯出。

## 變更範圍（最小必要）

- 版面與容器：
  - [src/views/OcrFlowView.vue](src/views/OcrFlowView.vue)
  - [src/components/ocr/OcrCanvasEditor.vue](src/components/ocr/OcrCanvasEditor.vue)
  - [src/components/ocr/OcrPiiPanel.vue](src/components/ocr/OcrPiiPanel.vue)
- Canvas 互動核心：
  - [src/composables/useCanvasEditor.ts](src/composables/useCanvasEditor.ts)
- 遮罩資料模型與操作：
  - [src/types/mask.ts](src/types/mask.ts)
  - [src/stores/document.ts](src/stores/document.ts)
  - [src/composables/usePiiMask.ts](src/composables/usePiiMask.ts)
- 匯出顏色對齊：
  - [src/core/export/maskCanvas.ts](src/core/export/maskCanvas.ts)
  - [src/composables/useExport.ts](src/composables/useExport.ts)（僅確認串接，不重構流程）

## 實作策略

1. **資料模型先擴充（低風險）**
   - 在 `MaskRect` 增加必要欄位：`fillColor`、`strokeColor`（hex 或 rgba 字串）。
   - 設定預設值（例如填色黑、邊線深色），確保舊資料與自動偵測遮罩能無痛沿用。
   - 在 store 新增「就地更新單一遮罩」API（例如 `updateMaskRectById`），避免只能 remove+add。

2. **Canvas 編輯互動升級（同一 composable 內完成）**
   - 在 `useCanvasEditor` 增加 hit-test 與互動模式：
     - `creating`（原本新框）
     - `moving`（拖曳框內移動）
     - `resizing`（四角 handle 縮放）
   - uiCanvas 顯示「目前選中遮罩」邊框與四角控制點；維持 pointer 事件集中在 uiCanvas，不改三層 canvas 架構。
   - 幾何更新一律換算回 image pixel 座標並做邊界裁切，避免越界與負寬高。

3. **顏色控制 UI（每個框獨立）**
   - 在 `OcrPiiPanel` 既有遮罩清單中，為每一筆加入兩個 color input：填色、邊線色。
   - 修改 emit 僅保留當前需求必需事件（符合最小 API 原則），由 `OcrFlowView` 轉接到 store 更新。

4. **預覽與匯出顏色一致**
   - `useCanvasEditor` 的 `drawMasks` 改為逐框套用 `fillColor` + `strokeColor`。
   - `buildMaskCanvas` 同步採用逐框顏色，確保 PNG/PDF 結果與畫面一致。
   - 不變更 export 主流程（仍是 base + off-screen mask 合成）。

5. **排版優化（與功能解耦）**
   - `OcrFlowView` 調整欄位比例/間距/斷點，讓左側預覽與右側控制面板層次更清楚。
   - `OcrCanvasEditor` 改善 stage 視覺（框線、背景、空狀態與載入狀態一致性）。
   - 保持局部樣式修改，不新增全域設計系統與大型重構。

## 驗收標準

- 可以在 canvas 上點選既有遮罩後：
  - 拖曳四角縮放
  - 拖曳框本體移動
- 每個遮罩都可分別設定填色與邊線色，且互不影響。
- 匯出 PNG / PDF 顏色與預覽一致（非固定黑色）。
- 原本流程仍可用：上傳 → OCR → PII 偵測 → 手動新增/刪除 → 匯出。
- `npm run type-check`、`npm run build`、`eslint` 通過。

## 風險與對策

- **座標轉換錯位**：維持 `getBoundingClientRect` 與 canvas bitmap 比例換算，所有互動統一走同一轉換函式。
- **互動衝突（新框 vs 編輯舊框）**：先做 hit-test，命中既有框才進入 move/resize，未命中才建立新框。
- **顏色欄位遺漏導致匯出異常**：在型別與繪製端都提供 fallback 預設值。
- **API 膨脹**：只新增本次必需 props/emits/store actions，不預留未來模式。
