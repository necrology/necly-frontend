import Image from "next/image";
import type { CommerceProduct } from "@/data/products";
import { cn } from "@/lib/utils";

type ProductBrandProps = {
  product: Pick<CommerceProduct, "brand" | "logoTone">;
  compact?: boolean;
  className?: string;
};

function DesktopProductAssets({ product }: Pick<ProductBrandProps, "product">) {
  const isBundle = product.logoTone === "disney" && product.brand.toLocaleLowerCase("id-ID").includes("netflix");

  if (product.logoTone === "disney") {
    return <><Image unoptimized src="/design-assets/logo-disney.png" alt="" width={308} height={90} />{isBundle && <><b>×</b><Image unoptimized src="/design-assets/logo-netflix.png" alt="" width={2226} height={678} /></>}</>;
  }
  if (product.logoTone === "apple") return <Image unoptimized src="/design-assets/logo-apple-one.png" alt="" width={377} height={91} />;
  if (product.logoTone === "viu") return <Image unoptimized src="/design-assets/logo-viu.png" alt="" width={239} height={90} />;
  if (product.logoTone === "nord") return <Image unoptimized src="/design-assets/logo-nordvpn.png" alt="" width={1200} height={267} />;
  if (product.logoTone === "netflix") return <Image unoptimized src="/design-assets/logo-netflix.png" alt="" width={2226} height={678} />;
  if (product.logoTone === "spotify") return <span className="spotify-asset-crop"><Image unoptimized src="/design-assets/logo-spotify.png" alt="" width={600} height={600} /></span>;
  if (product.logoTone === "youtube") return <Image unoptimized src="/design-assets/logo-youtube.png" alt="" width={216} height={90} />;
  return <Image unoptimized src="/design-assets/logo-microsoft-365.png" alt="" width={376} height={62} />;
}

export function ProductBrand({ product, compact = false, className }: ProductBrandProps) {
  const isBundle = product.logoTone === "disney" && product.brand.toLocaleLowerCase("id-ID").includes("netflix");

  return (
    <div className={cn("product-brand", `product-brand-${product.logoTone}`, compact && "compact", className)} aria-label={product.brand}>
      <span className="product-brand-fallback">
        {product.logoTone === "disney" ? <><span className="disney-word">Disney+</span>{isBundle && <><span className="brand-cross">×</span><span className="netflix-word">NETFLIX</span></>}</> : product.logoTone === "apple" ? <><span className="apple-mark">●</span><span>One</span></> : product.logoTone === "viu" ? <><span className="viu-mark">›</span><span>viu</span></> : product.logoTone === "nord" ? <><span className="nord-mark">▲</span><span>NordVPN</span></> : product.logoTone === "netflix" ? <span className="netflix-word">NETFLIX</span> : product.logoTone === "spotify" ? <><span className="spotify-mark">●</span><span>Spotify</span></> : product.logoTone === "youtube" ? <><span className="youtube-mark">▶</span><span>YouTube <b>Premium</b></span></> : <><span className="microsoft-mark"><i /><i /><i /><i /></span><span>Microsoft 365</span></>}
      </span>
      <span className={`figma-desktop-product-assets asset-${product.logoTone}`} aria-hidden="true"><DesktopProductAssets product={product} /></span>
    </div>
  );
}
