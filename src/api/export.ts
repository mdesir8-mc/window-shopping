import { apiClient } from "./client";

export type ExportFormat = "csv" | "json";

export async function downloadWishlistExport(format: ExportFormat) {
  const response = await apiClient.get<Blob>(`/api/items/export?format=${format}`, {
    responseType: "blob"
  });

  triggerDownload(response.data, `wishlist.${format}`);
}

export async function downloadClosetExport(closetId: string, closetName: string, format: ExportFormat) {
  const response = await apiClient.get<Blob>(`/api/closets/${closetId}/export?format=${format}`, {
    responseType: "blob"
  });

  triggerDownload(response.data, `${filenamePart(closetName)}.${format}`);
}

function triggerDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function filenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "wishlist";
}
