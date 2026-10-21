"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { safeProductImageSrc } from "@/lib/product-image";

type ProductPhotoProps = {
  src?: string | null;
  alt: string;
  fallbackSrc: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/**
 * Foto produk memakai <img> biasa agar data URL hasil unggah dashboard dan
 * URL https sama-sama bekerja tanpa optimizer Next. Bila foto kosong atau
 * gagal dimuat, ilustrasi yang sudah ada tetap tampil.
 */
export function ProductPhoto({ src, alt, fallbackSrc, className, loading = "lazy" }: ProductPhotoProps) {
  const safeSrc = safeProductImageSrc(src);
  // Simpan sumber yang gagal, bukan boolean: saat `src` berubah, sumber baru
  // otomatis dianggap belum gagal tanpa memicu setState di dalam effect.
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = Boolean(safeSrc && failedSource === safeSrc);
  const resolved = safeSrc && !failed ? safeSrc : fallbackSrc;

  return (
    // Data URL hasil unggah tidak kompatibel dengan optimizer Next.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn(className, failed && "is-fallback")}
      src={resolved}
      alt={alt}
      loading={loading}
      onError={() => {
        if (safeSrc && !failed) setFailedSource(safeSrc);
      }}
      data-photo-kind={safeSrc && !failed ? "product" : "fallback"}
    />
  );
}
