import { CheckCircle2, Eye } from "lucide-react";
import Link from "next/link";
import { ServiceVisual } from "@/components/service-visual";
import { formatIDR } from "@/lib/money";
import type { SubscriptionProduct } from "@/lib/types";

function badgeFor(product: SubscriptionProduct) {
  if (product.featured && product.category === "Streaming") return { label: "Populer", className: "popular" };
  if (product.featured) return { label: "Best Seller", className: "best" };
  if (product.stock === 0) return { label: "Preorder", className: "new" };
  if (product.stock <= 3) return { label: "Terbatas", className: "trending" };
  return null;
}

export function ServiceCard({ product }: { product: SubscriptionProduct }) {
  const badge = badgeFor(product);
  return (
    <article className="catalog-card">
      <ServiceVisual service={product} />
      <div className="catalog-card-content">
        <div className="catalog-card-topline">
          <span className="catalog-category">{product.category}</span>
          {badge && <span className={`catalog-badge ${badge.className}`}>{badge.label}</span>}
        </div>
        <h3>{product.name}</h3>
        <p className="catalog-duration">{product.duration} · {product.accessType}</p>
        <div className="catalog-price"><strong>{formatIDR(product.price)}</strong><span>/ bulan</span></div>
        <ul className="catalog-benefits">
          {product.benefits.slice(0, 2).map((benefit) => <li key={benefit}><CheckCircle2 size={13} />{benefit}</li>)}
        </ul>
        <div className="catalog-card-actions">
          <Link className="catalog-detail-link" href={`/products/${product.slug}`} aria-label={`Lihat ${product.name}`}><Eye size={14} />Lihat Skema Harga</Link>
          <Link className="catalog-order-button" href={`/products/${product.slug}`}>Pesan</Link>
        </div>
      </div>
    </article>
  );
}
