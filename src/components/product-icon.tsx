"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { isHttpsImageUrl, safeProductImageSrc } from "@/lib/product-image";
import { cn } from "@/lib/utils";

type ProductIconProps = {
  iconUrl?: string | null;
  name: string;
  className?: string;
  /** Visual lama yang dipakai bila `iconUrl` kosong atau gagal dimuat. */
  fallback?: ReactNode;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
};

/**
 * Icon produk dari kolom `icon_url`.
 *
 * Path aset publik memakai `next/image` supaya konsisten dengan komponen gambar
 * lain. URL https dan data URL unggahan dashboard memakai `<img>` karena tidak
 * bisa lewat optimizer Next tanpa `remotePatterns`; skema divalidasi oleh
 * `safeProductImageSrc`. Bila icon kosong/gagal, `fallback` (brand hardcoded
 * atau ilustrasi yang sudah ada) tetap tampil sehingga data demo lama aman.
 */
export function ProductIcon({
  iconUrl,
  name,
  className,
  fallback = null,
  width = 96,
  height = 40,
  loading = "lazy",
}: ProductIconProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = safeProductImageSrc(iconUrl);
  const failed = Boolean(source && failedSource === source);

  const handleError = () => source && setFailedSource(source);
  const label = `Icon ${name}`;
  const canvasStyle = { width, height };

  let content = fallback;
  if (source && !failed) {
    content = isHttpsImageUrl(source) || source.startsWith("data:") ? (
      <>
        {/* Data URL dan URL eksternal tidak kompatibel dengan optimizer Next. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="product-icon-image"
          src={source}
          alt={label}
          width={width}
          height={height}
          loading={loading}
          onError={handleError}
        />
      </>
    ) : (
      <Image
        className="product-icon-image"
        unoptimized
        src={source}
        alt={label}
        width={width}
        height={height}
        loading={loading}
        onError={handleError}
      />
    );
  }

  return (
    <span className={cn("product-icon", className)} data-testid="product-icon" style={canvasStyle}>
      {content}
    </span>
  );
}
