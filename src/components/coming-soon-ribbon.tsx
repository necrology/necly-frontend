import { cn } from "@/lib/utils";

type ComingSoonRibbonProps = {
  className?: string;
};

/**
 * Pita diagonal "Coming Soon" untuk pojok kanan atas kartu produk.
 *
 * Teks visual ditandai `aria-hidden` agar tidak dibacakan dua kali; pembaca
 * layar tetap mendapat kalimat lengkap lewat teks `.sr-only`.
 */
export function ComingSoonRibbon({ className }: ComingSoonRibbonProps) {
  return (
    <span className={cn("coming-soon-ribbon", className)} data-testid="coming-soon-ribbon">
      <span className="coming-soon-ribbon-text" aria-hidden="true">Coming Soon</span>
      <span className="sr-only">Produk ini segera hadir</span>
    </span>
  );
}
