// Browser-only: downscale photos before upload so phone pictures (often 4–12 MB)
// fit the 5 MB bucket limit and load fast on mobile data.
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("Unsupported image format. Use JPEG, PNG or WebP.");
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Could not process image");
  return blob;
}
