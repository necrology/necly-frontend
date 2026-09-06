import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, Palette, Search, Sparkles, Wrench } from "lucide-react";
import { ServiceCard } from "@/components/service-card";
import { services } from "@/data/seed";
import { formatIDR } from "@/lib/money";
import { DEMO_MODE } from "@/lib/api";

const categoryIcons = {
  Streaming: Palette,
  Produktivitas: BriefcaseBusiness,
  Kreatif: Sparkles,
  Edukasi: ChartNoAxesCombined,
  Keamanan: Wrench,
};

const homeCategories = ["Streaming", "Produktivitas", "Kreatif", "Edukasi", "Keamanan"] as const;

export default function HomePage() {
  const featured = services.filter((product) => product.featured).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Layanan digital siap pakai</span>
            <h1 className="display">Akses langganan <span className="brand-text">terpercaya</span>, tanpa repot.</h1>
            <p className="lede">Temukan slot anggota dan kursi tim untuk streaming, produktivitas, kreatif, edukasi, dan keamanan. Aktivasi via undangan resmi&mdash;tanpa berbagi kata sandi.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/products">Jelajahi katalog <ArrowRight size={15} /></Link>
              <Link className="button button-secondary" href="#cara-kerja">Lihat cara kerja</Link>
            </div>
            <div className="hero-note"><span /> {DEMO_MODE ? "Katalog demo" : "Katalog langsung"} · Aktivasi via undangan anggota atau kursi tim</div>
          </div>
          <div className="card discovery-panel" aria-label="Pratinjau penemuan layanan">
            <div className="discovery-top">
              <strong style={{ fontSize: 12 }}>Temukan langganan yang pas</strong>
              <span className="badge status-info">{DEMO_MODE ? "Demo" : "Langsung"}</span>
            </div>
            <div className="discovery-search"><Search size={15} /> Apa yang Anda butuhkan?</div>
            <div className="discovery-items">
              {services.slice(0, 4).map((product, index) => (
                <div className={`discovery-item ${index === 1 ? "selected" : ""}`} key={product.id}>
                  <span className="discovery-mark" style={{ background: index === 1 ? "#2463eb" : undefined }}>{product.name.split(" ").map((word) => word[0]).slice(0, 2)}</span>
                  <span>
                    <strong style={{ display: "block", fontSize: 11 }}>{product.name}</strong>
                    <small className="muted" style={{ fontSize: 9 }}>{product.duration}</small>
                  </span>
                  <span className="tabular" style={{ fontSize: 10, fontWeight: 600 }}>{formatIDR(product.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Prinsip marketplace">
        <div className="container trust-grid">
          <div className="trust-cell"><div><strong style={{ fontSize: 13 }}>Undangan resmi, bukan kata sandi</strong><div className="trust-label">Aktivasi lewat tautan anggota atau kursi tim yang sah.</div></div></div>
          <div className="trust-cell"><div><div className="trust-value tabular">{services.length}</div><div className="trust-label">produk digital</div></div></div>
          <div className="trust-cell"><div><div className="trust-value tabular">5</div><div className="trust-label">kategori</div></div></div>
          <div className="trust-cell"><div><div className="trust-value tabular">1:1</div><div className="trust-label">profil pribadi terpisah</div></div></div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <div className="section-heading" style={{ marginBottom: 24 }}>
            <div><span className="eyebrow">Mulai dari kategori</span><h2 className="h2" style={{ marginTop: 12 }}>Katalog tercurasi, fokus pada akses.</h2></div>
            <p className="lede" style={{ fontSize: 14 }}>Setiap produk menawarkan durasi, stok slot, dan catatan syarat & ketentuan yang transparan.</p>
          </div>
          <div className="category-rail">
            {homeCategories.map((category) => {
              const Icon = categoryIcons[category];
              return <Link className="category-chip" href={`/products?category=${category}`} key={category}><Icon size={14} />{category}</Link>;
            })}
          </div>
        </div>
      </section>

      <section className="section section-rule">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">Unggulan minggu ini</span><h2 className="h2" style={{ marginTop: 12 }}>Slot siap aktif dengan undangan resmi.</h2></div>
            <div style={{ display: "grid", justifyItems: "start", gap: 18 }}>
              <p className="lede" style={{ fontSize: 14 }}>Tiga pilihan populer untuk streaming, produktivitas, dan keamanan.</p>
              <Link href="/products" className="button button-secondary">Lihat semua produk <ArrowRight size={14} /></Link>
            </div>
          </div>
          <div className="service-grid">{featured.map((product) => <ServiceCard product={product} key={product.id} />)}</div>
        </div>
      </section>

      <section className="section" id="cara-kerja">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">Dari butuh ke aktif</span><h2 className="h2" style={{ marginTop: 12 }}>Kurangi ketidakpastian di setiap langkah.</h2></div>
            <p className="lede" style={{ fontSize: 14 }}>Necly Services memudahkan evaluasi, mulai, dan pelacakan langganan digital.</p>
          </div>
          <div className="process-list">
            <article className="process-step"><h3 className="h3">Pilih berdasarkan hasil</h3><p className="muted">Bandingkan manfaat, durasi, ketersediaan, dan bukti—bukan kemampuan samar.</p></article>
            <article className="process-step"><h3 className="h3">Undangan sekali pakai</h3><p className="muted">Terima tautan anggota resmi ke email Anda, lalu aktifkan di akun pribadi.</p></article>
            <article className="process-step"><h3 className="h3">Lacak progres terlihat</h3><p className="muted">Langkah pesanan dan aktivitas menjaga akuntabilitas dari konfirmasi hingga aktif.</p></article>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container cta-band">
          <div><span className="eyebrow">Siap saat Anda butuh</span><h2 className="h2" style={{ marginTop: 9 }}>Temukan langganan yang layak dimulai.</h2></div>
          <Link className="button button-primary" href="/products">Jelajahi katalog <ArrowRight size={15} /></Link>
        </div>
      </section>
    </>
  );
}