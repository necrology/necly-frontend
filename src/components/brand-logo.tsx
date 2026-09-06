import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = { compact?: boolean; className?: string; href?: string };

export function BrandLogo({ compact = false, className, href = "/" }: BrandLogoProps) {
  return (
    <Link className={cn("brand", className)} href={href} aria-label="Beranda Necly Services">
      <Image src="/brand/necly-services-logo-icon-only.svg" width={40} height={40} alt="" priority />
      {!compact && <span className="brand-copy">Necly Services</span>}
    </Link>
  );
}
