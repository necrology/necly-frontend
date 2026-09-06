import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ServiceVisual } from "@/components/service-visual";
import { formatIDR } from "@/lib/money";
import type { SubscriptionProduct } from "@/lib/types";

export function ServiceCard({ product }: { product: SubscriptionProduct }) {
  return (
    <article className="card card-hover service-card">
      <Link href={`/products/${product.slug}`} aria-label={`Lihat ${product.name}`}>
        <ServiceVisual service={product} />
        <div className="service-card-body">
          <div className="service-meta">
            <span className="eyebrow" style={{ fontSize: 9 }}>{product.category}</span>
          </div>
          <div>
            <h3 className="h3">{product.name}</h3>
            <p className="service-summary">{product.summary}</p>
          </div>
          <div className="service-bottom">
            <span>
              <span className="price-label">Mulai dari</span>
              <span className="price tabular">{formatIDR(product.price)}</span>
            </span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </div>
        </div>
      </Link>
    </article>
  );
}
