/**
 * 以暫時 `blob:` URL 觸發瀏覽器下載，並立即釋放 URL。
 *
 * @param blob 要下載的內容
 * @param filename 下載檔名（含副檔名）
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
