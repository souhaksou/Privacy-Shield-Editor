import { storeToRefs } from "pinia";
import { detectPii } from "@/core/pii/detect";
import { mapMatchesToBboxes } from "@/core/pii/mapMatchesToBboxes";
import { buildMaskRects } from "@/core/mask/buildMaskRects";
import { useDocumentStore } from "@/stores/document";
import type { MaskRectInput } from "@/types/mask";

/**
 * Phase 3：PII 偵測與遮罩編排（串接 `document` store 與 core 偵測管線）。
 *
 * **偵測用文字**：一律使用 `ocrResult.text`，不使用 `correctedText`。`detectPii` 與
 * `mapMatchesToBboxes` 必須共用同一段字串且與 `ocrResult.words` 對齊；若改以編修後全文偵測，
 * 與 words 脫節時映射會大量失敗（見 phase3 計畫風險說明）。
 *
 * **再偵測**：以本次偵測產生的 auto 遮罩取代上一輪 auto，並**保留** `source === "manual"` 的項目。
 * 若要連手動遮罩一併捨棄後重算，請先呼叫 `clearMasks()` 再執行偵測。
 *
 * @returns 遮罩列表與 OCR 相關唯讀狀態（`storeToRefs`），以及偵測／增刪／清空操作
 */
export function usePiiMask() {
  const documentStore = useDocumentStore();
  const { maskRects, hasMasks, hasOcr } = storeToRefs(documentStore);

  /**
   * 依目前 store 中的 OCR 結果執行 regex PII 偵測，產生 auto 遮罩並寫入 store。
   * 無可用 `words` 時不變更遮罩，避免在資料不完整時覆寫狀態。
   *
   * @returns `ok` 表示是否具備 OCR 且已寫入；`maskCount` 於成功時為寫入後總數（新 auto + 保留手動），
   *          於失敗時為當前遮罩數（未寫入 store）
   */
  function runPiiDetectFromOcr(): { ok: boolean; maskCount: number } {
    const ocr = documentStore.ocrResult;
    if (!ocr?.words?.length) {
      return { ok: false, maskCount: documentStore.maskRects.length };
    }

    const textForDetect = ocr.text;
    const matches = detectPii(textForDetect);
    const mapped = mapMatchesToBboxes(textForDetect, ocr.words, matches);
    const autoRects = buildMaskRects(mapped);
    const preservedManual = documentStore.maskRects.filter((r) => r.source === "manual");
    documentStore.setMaskRects([...autoRects, ...preservedManual]);

    return { ok: true, maskCount: autoRects.length + preservedManual.length };
  }

  /**
   * 追加一塊遮罩（通常為手動框選；請傳 `source: "manual"` 以與 auto 偵測區隔）。
   *
   * @param input 幾何與來源；`id` 可省略，由 store 自動補齊
   */
  function addMaskRect(input: MaskRectInput) {
    documentStore.addMaskRect(input);
  }

  /**
   * 依穩定 `id` 移除單塊遮罩；無符合項時 store 不變。
   *
   * @param id `MaskRect.id`
   */
  function removeMaskRect(id: string) {
    documentStore.removeMaskRect(id);
  }

  /** 清空所有遮罩（含 auto 與 manual）；不影響圖檔與 OCR 結果。 */
  function clearMasks() {
    documentStore.clearMasks();
  }

  return {
    maskRects,
    hasMasks,
    hasOcr,
    runPiiDetectFromOcr,
    addMaskRect,
    removeMaskRect,
    clearMasks,
  };
}
