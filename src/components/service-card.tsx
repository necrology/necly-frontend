import { CheckCircle2, Eye } from "lucide-react";
import Link from "next/link";
import { ComingSoonRibbon } from "@/components/coming-soon-ribbon";
import { ProductIcon } from "@/components/product-icon";
import { ServiceVisual } from "@/components/service-visual";
import { formatIDR } from "@/lib/money";
import { productCategoryLabel } from "@/lib/product-category";
import type { SubscriptionProduct } from "@/lib/types";

function badgeFor(product: SubscriptionProduct) {
  // Badge Coming Soon harus menang atas Preorder/Stok/featured agar status
  // produk tidak terbaca sebagai "habis" atau "sedang tren".
  if (product.comingSoon) return { label: "Coming Soon", className: "coming-soon" };
  if (product.featured && product.category === "Streaming") return { label: "Populer", className: "popular" };
  if (product.featured) return { label: "Best Seller", className: "best" };
  if (product.stock === 0) return { label: "Preorder", className: "new" };
  if (product.stock <= 3) return { label: "Terbatas", className: "trending" };
  return null;
}

export function ServiceCard({ product }: { product: SubscriptionProduct }) {
  const badge = badgeFor(product);
  const comingSoon = product.comingSoon === true;

  return (
    <article className={`catalog-card ${comingSoon ? "is-coming-soon" : ""}`}>
      {comingSoon && <ComingSoonRibbon />}
      <ServiceVisual service={product} />
      <div className="catalog-card-content">
        <div className="catalog-card-topline">
          <span className="catalog-card-meta">
            <ProductIcon
              iconUrl={product.iconUrl}
              name={product.name}
              className="catalog-product-icon"
              width={48}
              height={22}
            />
            <span className="catalog-category">{productCategoryLabel(product)}</span>
          </span>
          {badge && <span className={`catalog-badge ${badge.className}`}>{badge.label}</span>}
        </div>
        <h3>{product.name}</h3>
        <p className="catalog-duration">{product.duration} · {product.accessType}</p>
        <div className="catalog-price"><strong>{formatIDR(product.price)}</strong><span>/ bulan</span></div>
        <ul className="catalog-benefits">
          {product.benefits.slice(0, 2).map((benefit) => <li key={benefit}><CheckCircle2 size={13} />{benefit}</li>)}
        </ul>
        <div className="catalog-card-actions">
          {comingSoon ? (
            <>
              <span className="catalog-detail-link is-disabled" aria-disabled="true"><Eye size={14} />Lihat Skema Harga</span>
              <span className="catalog-order-button is-disabled" aria-disabled="true">Pesan</span>
            </>
          ) : (
            <>
              <Link className="catalog-detail-link" href={`/products/${product.slug}`} aria-label={`Lihat ${product.name}`}><Eye size={14} />Lihat Skema Harga</Link>
              <Link className="catalog-order-button" href={`/products/${product.slug}`}>Pesan</Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
