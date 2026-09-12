import type { CommerceProduct } from "@/data/products";
import { cn } from "@/lib/utils";

type ProductBrandProps = {
  product: Pick<CommerceProduct, "brand" | "logoTone">;
  compact?: boolean;
  className?: string;
};

export function ProductBrand({ product, compact = false, className }: ProductBrandProps) {
  return (
    <div className={cn("product-brand", `product-brand-${product.logoTone}`, compact && "compact", className)} aria-label={product.brand}>
      {product.logoTone === "disney" ? <><span className="disney-word">Disney+</span><span className="brand-cross">×</span><span className="netflix-word">NETFLIX</span></> : product.logoTone === "apple" ? <><span className="apple-mark">●</span><span>One</span></> : product.logoTone === "viu" ? <><span className="viu-mark">›</span><span>viu</span></> : product.logoTone === "nord" ? <><span className="nord-mark">▲</span><span>NordVPN</span></> : product.logoTone === "netflix" ? <span className="netflix-word">NETFLIX</span> : product.logoTone === "spotify" ? <><span className="spotify-mark">●</span><span>Spotify</span></> : product.logoTone === "youtube" ? <><span className="youtube-mark">▶</span><span>YouTube <b>Premium</b></span></> : <><span className="microsoft-mark"><i /><i /><i /><i /></span><span>Microsoft 365</span></>}
    </div>
  );
}
