import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { DEMO_MODE } from "@/lib/api";

const links = {
  Navigasi: [["Beranda", "/"], ["Layanan", "/products"], ["Cara Berlangganan", "/cara-berlangganan"]],
  Bantuan: [["FAQ", "/faq"], ["Laporan Kendala", "/laporan-kendala"], ["Masuk", "/login"]],
  Akun: [["Buat akun", "/register"], ["Keranjang Anda", "/cart"], ["Pesanan saya", "/orders"]],
};

export function SiteFooter() {
  return <footer className="site-footer"><div className="container footer-main"><div className="footer-brand-col"><BrandLogo /><p className="footer-copy">Solusi hemat berlangganan layanan premium dengan proses pemesanan yang jelas.</p></div>{Object.entries(links).map(([heading, items]) => <div key={heading}><h2 className="footer-heading">{heading}</h2><div className="footer-links">{items.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div></div>)}</div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Necly Services. Hak cipta dilindungi.</span><span>{DEMO_MODE ? "Mode demo · Tidak memproses pembayaran nyata" : "Pembayaran aman · Aktivasi melalui undangan atau kursi resmi"}</span></div></footer>;
}
