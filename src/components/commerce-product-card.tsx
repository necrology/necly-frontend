import { CheckCircle2, Clock3, Eye, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import type { CommerceProduct } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { ProductBrand } from "@/components/product-brand";

type CommerceProductCardProps = {
  product: CommerceProduct;
  compact?: boolean;
  actionLabel?: string;
};

// Setiap badge punya ilustrasi sendiri supaya lebih menarik (permintaan QA baris 32).
const badgeIcons = { Populer: Flame, "Best Seller": Trophy, Trending: Zap, Baru: Sparkles, Preorder: Clock3 } as const;

export function CommerceProductCard({ product, compact = false, actionLabel = "Pesan" }: CommerceProductCardProps) {
  const BadgeIcon = product.badge ? badgeIcons[product.badge] : null;

  return (
    <article className={`commerce-product-card ${compact ? "is-compact" : ""}`}>
      <div className="commerce-card-brand-row">
        <ProductBrand product={product} compact={compact} />
        {product.badge && BadgeIcon && <span className={`commerce-badge ${product.badge.toLowerCase().replace(" ", "-")}`}><BadgeIcon size={11} strokeWidth={2.5} aria-hidden="true" />{product.badge}</span>}
      </div>
      <div className="commerce-card-copy">
        <h3>{product.name}</h3>
        <p className="commerce-package">{product.packageName}</p>
        <p className="commerce-price"><strong>{formatRupiahLabel(product.price)}</strong><span>/ bulan</span>{compact && <s>{formatRupiahLabel(product.providerPrice)}</s>}</p>
        {compact ? (
          <div className="commerce-stock">
            <span className={`commerce-stock-pill ${product.stock <= 10 ? "limited" : "ready"}`}>{product.stock <= 10 ? "Stok Terbatas" : "Stok Tersedia"}</span>
            <span className="commerce-stock-bar"><i style={{ width: `${Math.min(100, Math.round((product.stock / 20) * 100))}%` }} /></span>
          </div>
        ) : (
          <ul className="commerce-benefits">{product.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={13} />{benefit}</li>)}</ul>
        )}
      </div>
      <div className="commerce-card-actions">
        {/* Baris 31: card di beranda juga harus punya icon mata + "skema harga". */}
        <Link href={`/products/${product.slug}`} className="commerce-scheme-link"><Eye size={15} />Lihat Skema Harga</Link>
        <Link href={`/products/${product.slug}`} className="commerce-order-link">{actionLabel}</Link>
      </div>
    </article>
  );
}
