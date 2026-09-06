import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="container section"><div className="empty-state"><Compass size={32}/><span className="eyebrow">404 · Halaman tidak ditemukan</span><h1 className="h2">Jalur ini tidak menuju ke layanan.</h1><p className="muted">Halaman mungkin telah dipindahkan, atau layanan tidak lagi tersedia di katalog.</p><div className="hero-actions"><Link className="button button-primary" href="/products">Lihat katalog</Link><Link className="button button-secondary" href="/">Kembali ke beranda</Link></div></div></main>;
}
