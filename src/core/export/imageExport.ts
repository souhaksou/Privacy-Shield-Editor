/** 組合匯出 canvas 所需來源（MVP 以 base 為主，mask 為可選疊層）。 */
export interface ComposeExportCanvasInput {
  base: HTMLImageElement | HTMLCanvasElement;
  mask?: HTMLCanvasElement;
}

/**
 * 建立最終匯出的 canvas。
 *
 * MVP 階段先輸出 base，若傳入 mask 則疊加於 base 之上。
 *
 * @param input 匯出來源設定；`base` 為必要，`mask` 為可選
 * @returns 可直接用於後續 PNG/PDF 匯出的合成 canvas
 */
export function composeExportCanvas(input: ComposeExportCanvasInput): HTMLCanvasElement {
  const { base, mask } = input;
  const width = getRenderableWidth(base);
  const height = getRenderableHeight(base);

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid export source size.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create 2D context for export canvas.");
  }

  ctx.drawImage(base, 0, 0, width, height);

  if (mask) {
    ctx.drawImage(mask, 0, 0, width, height);
  }

  return canvas;
}

/**
 * 將 canvas 轉為 PNG Blob。
 *
 * @param canvas 目標匯出 canvas
 * @returns 解析後可供下載或轉 bytes 的 PNG Blob
 */
export function exportCanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to export canvas to PNG blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function getRenderableWidth(source: HTMLImageElement | HTMLCanvasElement): number {
  return source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
}

function getRenderableHeight(source: HTMLImageElement | HTMLCanvasElement): number {
  return source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
}
