/** 建立 image-based PDF 所需輸入資料（單頁、維持圖片原始比例）。 */
export interface BuildImagePdfInput {
  imageBytes: Uint8Array;
  width: number;
  height: number;
  format?: "png" | "jpg";
}

/**
 * 使用單張圖片建立 image-based 單頁 PDF。
 *
 * @param input 圖片 bytes 與頁面尺寸設定；`format` 預設為 `png`
 * @returns 產生後可直接下載或寫檔的 PDF bytes
 */
export async function buildImagePdf(input: BuildImagePdfInput): Promise<Uint8Array> {
  const { imageBytes, width, height, format = "png" } = input;
  const { PDFDocument } = await import("pdf-lib");

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid image size for PDF export.");
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([width, height]);

  const embeddedImage =
    format === "jpg" ? await pdf.embedJpg(imageBytes) : await pdf.embedPng(imageBytes);

  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  return pdf.save();
}
