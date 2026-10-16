import Link from "next/link";
import { Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { WhatsappIcon } from "@/components/social-icons";
import { contact, openingHours, whatsappLink } from "@/data/contact";

const links = [["Beranda", "/"], ["Layanan", "/products"], ["Cara Berlangganan", "/cara-berlangganan"], ["FAQ", "/faq"], ["Testimoni", "/testimoni"], ["Tentang Kami", "/about"], ["Laporan Kendala", "/laporan-kendala"], ["Kebijakan Privasi", "/kebijakan-privasi"], ["Syarat & Ketentuan", "/syarat-ketentuan"]] as const;

// Copy perkenalan diambil apa adanya dari dokumen QA (poin 16).
const intro = "Kami hadir sebagai layanan digital yang menyediakan berbagai pilihan akun sharing dan layanan premium untuk kebutuhan hiburan dan produktivitas. Kami membantu pengguna mendapatkan akses ke berbagai layanan digital populer seperti Netflix, Disney+, dan layanan premium lainnya dengan proses yang praktis dan pilihan harga yang lebih terjangkau. Dengan Komitmen kami memberikan pengalaman berlangganan yang mudah, transparan, dan nyaman, mulai dari pemilihan layanan hingga proses aktivasi.";

const whatsappMessage = "Halo Necly Service, saya ingin bertanya tentang layanan Anda.";

export function SiteFooter() {
  return (
    <footer className="commerce-footer">
      {/* Tiga kolom di desktop: brand, kanal kontak + kategori, hubungi kami + jam operasional. */}
      <div className="commerce-container commerce-footer-content">
        <div className="commerce-footer-brand">
          <div className="commerce-footer-brand-head">
            <BrandLogo compact />
            <strong>Necly Service</strong>
          </div>
          <p>{intro}</p>
        </div>
        <div className="commerce-footer-columns">
          <section className="commerce-footer-block">
            <h2>Sosmed</h2>
            <ul className="commerce-footer-socials">
              <li><a href={whatsappLink(whatsappMessage)} target="_blank" rel="noreferrer"><WhatsappIcon size={17} />{contact.whatsappLabel}</a></li>
            </ul>
          </section>
          <section className="commerce-footer-block">
            <h2>Kategori Produk</h2>
            <ul className="commerce-footer-socials"><li><Link href="/products">Produk Digital</Link></li></ul>
          </section>
        </div>
        <div className="commerce-footer-columns">
          <section className="commerce-footer-block">
            <h2>Hubungi Kami</h2>
            <ul className="commerce-footer-socials">
              <li><a href={`mailto:${contact.email}`}><Mail size={16} />{contact.email}</a></li>
              <li><a href={whatsappLink(whatsappMessage)} target="_blank" rel="noreferrer"><WhatsappIcon size={17} />{contact.whatsappLabel}</a></li>
            </ul>
          </section>
          <section className="commerce-footer-block">
            <h2>Jam Operasional</h2>
            <p>{openingHours}</p>
          </section>
        </div>
      </div>
      <div className="commerce-container commerce-footer-bottom">
        <nav aria-label="Navigasi footer">{links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</nav>
        <span>© 2026 Necly Services. All rights reserved.</span>
      </div>
    </footer>
  );
}
