"use client";

import { CheckCircle2, Clock3, Eye, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CommerceProduct } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { safeProductImageSrc } from "@/lib/product-image";
import { ProductBrand } from "@/components/product-brand";

type CommerceProductCardProps = {
  product: CommerceProduct;
  compact?: boolean;
  actionLabel?: string;
};

// Setiap badge punya ilustrasi sendiri supaya lebih menarik (permintaan QA baris 32).
const badgeIcons = { Populer: Flame, "Best Seller": Trophy, Trending: Zap, Baru: Sparkles, Preorder: Clock3, "Coming Soon": Clock3 } as const;

export function CommerceProductCard({ product, compact = false, actionLabel = "Pesan" }: CommerceProductCardProps) {
  const comingSoon = product.comingSoon === true;
  const badgeLabel = comingSoon ? "Coming Soon" : product.badge;
  const BadgeIcon = badgeLabel ? badgeIcons[badgeLabel] : null;
  const photo = safeProductImageSrc(product.imageUrl);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photo && !photoFailed);

  return (
    <article className={`commerce-product-card ${compact ? "is-compact" : ""} ${comingSoon ? "is-coming-soon" : ""}`}>
      {showPhoto && (
        <div className="commerce-card-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={`Foto produk ${product.name}`} loading="lazy" onError={() => setPhotoFailed(true)} />
        </div>
      )}
      <div className="commerce-card-brand-row">
        <ProductBrand product={product} compact={compact} />
        {badgeLabel && BadgeIcon && <span className={`commerce-badge ${badgeLabel.toLowerCase().replace(" ", "-")}`}><BadgeIcon size={11} strokeWidth={2.5} aria-hidden="true" />{badgeLabel}</span>}
      </div>
      <div className="commerce-card-copy">
        <h3>{product.name}</h3>
        <p className="commerce-package">{product.packageName}</p>
        <p className="commerce-price"><strong>{formatRupiahLabel(product.price)}</strong><span>/ bulan</span>{compact && <s>{formatRupiahLabel(product.providerPrice)}</s>}</p>
        {compact ? (
          comingSoon ? (
            <div className="commerce-stock">
              <span className="commerce-stock-pill coming-soon">Coming Soon</span>
            </div>
          ) : (
            <div className="commerce-stock">
              <span className={`commerce-stock-pill ${product.stock <= 10 ? "limited" : "ready"}`}>{product.stock <= 10 ? "Stok Terbatas" : "Stok Tersedia"}</span>
              <span className="commerce-stock-bar"><i style={{ width: `${Math.min(100, Math.round((product.stock / 20) * 100))}%` }} /></span>
            </div>
          )
        ) : (
          <ul className="commerce-benefits">{product.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={13} />{benefit}</li>)}</ul>
        )}
      </div>
      <div className="commerce-card-actions">
        {/* Baris 31: card di beranda juga harus punya icon mata + "skema harga". */}
        {comingSoon ? (
          <>
            <span className="commerce-scheme-link is-disabled" aria-disabled="true"><Eye size={15} />Lihat Skema Harga</span>
            <span className="commerce-order-link is-disabled" aria-disabled="true">{actionLabel}</span>
          </>
        ) : (
          <>
            <Link href={`/products/${product.slug}`} className="commerce-scheme-link"><Eye size={15} />Lihat Skema Harga</Link>
            <Link href={`/products/${product.slug}`} className="commerce-order-link">{actionLabel}</Link>
          </>
        )}
      </div>
    </article>
  );
}
