export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_ACCEPT = PRODUCT_IMAGE_TYPES.join(",");
export const PRODUCT_IMAGE_MAX_DIMENSION = 1000;
export const PRODUCT_IMAGE_QUALITY = 0.82;

export type ProductImageLike = { type: string; size: number };

/** Pesan validasi siap tampil, atau null bila file memenuhi kontrak. */
export function validateProductImageFile(file: ProductImageLike): string | null {
  if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Format foto harus JPG, PNG, atau WebP.";
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return "Ukuran foto maksimal 2 MB.";
  }
  return null;
}

/**
 * Hanya izinkan sumber gambar yang aman untuk atribut `src`. Data URL hasil
 * kompresi browser dan URL https eksternal diterima; skema lain (mis.
 * `javascript:`) ditolak agar tidak menjadi vektor XSS.
 */
export function safeProductImageSrc(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return trimmed;
  if (/^https:\/\/[^\s]+$/i.test(trimmed)) return trimmed;
  // Aset publik yang sudah ada di repo tetap boleh dipakai sebagai fallback.
  if (/^\/(?!\/)[^\s]*$/.test(trimmed)) return trimmed;
  return undefined;
}

export function isHttpsImageUrl(value: string) {
  return /^https:\/\/[^\s]+$/i.test(value.trim());
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca.")));
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Foto tidak dapat dibuka."));
    image.src = src;
  });
}

/**
 * Kompres di browser: sisi terpanjang maksimal 1000 px dan kualitas ~0.82.
 * Hasilnya data URL agar backend tidak membutuhkan object storage baru.
 */
export async function compressProductImage(file: File): Promise<string> {
  const invalid = validateProductImageFile(file);
  if (invalid) throw new Error(invalid);

  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
  if (!longestSide) throw new Error("Dimensi foto tidak valid.");

  const scale = Math.min(1, PRODUCT_IMAGE_MAX_DIMENSION / longestSide);
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return original;
  context.drawImage(image, 0, 0, width, height);

  // PNG transparan tetap aman sebagai WebP; JPG tetap JPG agar kompatibel.
  const outputType = file.type === "image/png" ? "image/webp" : file.type;
  const compressed = canvas.toDataURL(outputType, PRODUCT_IMAGE_QUALITY);
  return compressed.startsWith("data:image/") ? compressed : original;
}
