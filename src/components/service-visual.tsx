import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SubscriptionProduct } from "@/lib/types";

export function ServiceVisual({ service, compact = false }: { service: SubscriptionProduct; compact?: boolean }) {
  const illustration = service.category === "Streaming" ? "/illustrations/product-streaming.svg" : "/illustrations/product-workspace.svg";
  return (
    <div className={cn("service-visual", `accent-${service.accent}`)} style={compact ? { height: 110 } : undefined} aria-hidden="true">
      <Image className="service-art" src={illustration} alt="" fill sizes="(max-width: 580px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      <span className="service-type">{service.category}</span>
      <span className="service-stock">{service.stock > 0 ? `${service.stock} slot` : "Preorder"}</span>
    </div>
  );
}
