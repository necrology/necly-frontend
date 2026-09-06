import { cn } from "@/lib/utils";
import type { SubscriptionProduct } from "@/lib/types";

export function ServiceVisual({ service, compact = false }: { service: SubscriptionProduct; compact?: boolean }) {
  const letters = service.name.split(" ").slice(0, 2).map((part) => part[0]).join("");
  return (
    <div className={cn("service-visual", `accent-${service.accent}`)} style={compact ? { height: 110 } : undefined} aria-hidden="true">
      <div className="service-motif"><span>{letters}</span></div>
    </div>
  );
}
