import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { DEMO_MODE } from "@/lib/api";

const links = {
  Marketplace: [
    ["Semua produk", "/products"],
    ["Produk streaming", "/products?category=Streaming"],
    ["Produk produktivitas", "/products?category=Produktivitas"],
    ["Produk kreatif", "/products?category=Kreatif"],
  ],
  Perusahaan: [
    ["Tentang Necly", "/about"],
    ["Dashboard admin", "/dashboard"],
  ],
  Akun: [
    ["Masuk", "/login"],
    ["Buat akun", "/register"],
    ["Keranjang Anda", "/cart"],
  ],
};

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand-col">
          <BrandLogo />
          <p className="footer-copy">Solusi hemat berlangganan akun premium, aman dan terpercaya.</p>
        </div>
        {Object.entries(links).map(([heading, items]) => (
          <div key={heading}>
            <h2 className="footer-heading">{heading}</h2>
            <div className="footer-links">
              {items.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
            </div>
          </div>
        ))}
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Necly Services. Hak cipta dilindungi.</span>
        <span>{DEMO_MODE ? "Mode demo · Tidak memproses pembayaran nyata" : "Pembayaran aman · Aktivasi melalui undangan atau kursi resmi"}</span>
      </div>
    </footer>
  );
}
