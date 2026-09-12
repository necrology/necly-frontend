import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { FacebookIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from "@/components/social-icons";

const links = [["Beranda", "/"], ["Layanan", "/products"], ["Cara Berlangganan", "/cara-berlangganan"], ["FAQ", "/faq"], ["Blog", "/about"], ["Laporan Kendala", "/laporan-kendala"]] as const;

const socials = [
  ["Facebook", "https://facebook.com", FacebookIcon],
  ["Instagram", "https://instagram.com", InstagramIcon],
  ["YouTube", "https://youtube.com", YoutubeIcon],
  ["TikTok", "https://tiktok.com", TiktokIcon],
] as const;

export function SiteFooter() {
  return (
    <footer className="commerce-footer">
      <div className="commerce-container commerce-footer-content">
        <div className="commerce-footer-brand">
          <BrandLogo compact />
          <div>
            <strong>NS</strong>
            <p>Solusi premium untuk hiburan tanpa batas.<br />Lebih hemat, lebih seru bersama!</p>
          </div>
        </div>
        <nav aria-label="Navigasi footer">{links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</nav>
        <div className="commerce-footer-social">
          {socials.map(([label, href, Icon]) => <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer"><Icon size={19} /></a>)}
          <span>© 2024 NS. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
