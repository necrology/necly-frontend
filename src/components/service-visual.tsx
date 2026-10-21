import Image from "next/image";
import { ProductPhoto } from "@/components/product-photo";
import { safeProductImageSrc } from "@/lib/product-image";
import { cn } from "@/lib/utils";
import type { SubscriptionProduct } from "@/lib/types";

export function productIllustration(category: SubscriptionProduct["category"]) {
  return category === "Streaming" ? "/illustrations/product-streaming.svg" : "/illustrations/product-workspace.svg";
}

export function ServiceVisual({ service, compact = false }: { service: SubscriptionProduct; compact?: boolean }) {
  const illustration = productIllustration(service.category);
  const hasPhoto = Boolean(safeProductImageSrc(service.imageUrl));

  return (
    <div className={cn("service-visual", `accent-${service.accent}`)} style={compact ? { height: 110 } : undefined}>
      {hasPhoto ? (
        <ProductPhoto
          className="service-photo"
          src={service.imageUrl}
          alt={`Foto produk ${service.name}`}
          fallbackSrc={illustration}
        />
      ) : (
        <Image className="service-art" src={illustration} alt="" fill sizes="(max-width: 580px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      )}
      <span className="service-type">{service.category}</span>
      <span className="service-stock">{service.comingSoon ? "Coming Soon" : service.stock > 0 ? `${service.stock} akses` : "Preorder"}</span>
    </div>
  );
}
