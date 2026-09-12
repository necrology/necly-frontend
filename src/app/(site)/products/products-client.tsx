"use client";

import { ChevronDown, Clock3, Flame, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ServiceCard } from "@/components/service-card";
import { categories, services, type SubscriptionProduct } from "@/data/seed";
import { filterProducts } from "@/lib/catalog";
import { catalogApi, DEMO_MODE } from "@/lib/api";
import { mapApiProduct } from "@/lib/product-mapper";

type ProductsClientProps = { initialCategory?: string };

function useOfferCountdown() {
  const [seconds, setSeconds] = useState(170 * 60 * 60 + 8 * 60 + 25);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value > 0 ? value - 1 : 170 * 60 * 60 + 8 * 60 + 25), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60] as const;
}

export function ProductsClient({ initialCategory = "Semua" }: ProductsClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(categories.includes(initialCategory as never) ? initialCategory : "Semua");
  const [loading, setLoading] = useState(false);
  const [apiProducts, setApiProducts] = useState<SubscriptionProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hours, minutes, seconds] = useOfferCountdown();

  useEffect(() => {
    if (!DEMO_MODE) {
      let cancelled = false;
      Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
      catalogApi.listProducts({ category: category === "Semua" ? undefined : category })
        .then((res) => { if (!cancelled) { setApiProducts(res.products.map(mapApiProduct)); setError(null); } })
        .catch(() => { if (!cancelled) setError("Produk belum dapat dimuat. Silakan coba lagi."); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
  }, [category]);

  const sourceProducts = useMemo(() => (DEMO_MODE || apiProducts === null ? services : apiProducts), [apiProducts]);
  const filtered = useMemo(() => filterProducts(sourceProducts, { query, category, maxPrice: 1_000_000, inStockOnly: false }), [query, category, sourceProducts]);
  const timeParts = [[hours, "Jam"], [minutes, "Menit"], [seconds, "Detik"]] as const;

  return (
    <div className="catalog-reference-shell">
      <div className="container catalog-controls">
        <label className="catalog-search"><Search size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari Produk..." aria-label="Cari produk" /></label>
        <label className="catalog-select"><span>{category === "Semua" ? "Semua Kategori" : category}</span><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter kategori">{categories.map((item) => <option key={item} value={item}>{item === "Semua" ? "Semua Kategori" : item}</option>)}</select><ChevronDown size={17} /></label>
      </div>
      <section className="container offer-banner" aria-label="Penawaran spesial">
        <div className="offer-copy"><Flame size={30} fill="currentColor" /><div><strong>Penawaran Spesial Hari Ini!</strong><span>Dapatkan harga terbaik untuk berbagai layanan premium favorit kamu.</span></div></div>
        <div className="offer-timer"><Clock3 size={18} /><span>Berakhir dalam:</span><div className="offer-time-parts">{timeParts.map(([value, label], index) => <div className="offer-time" key={label}><b>{String(value).padStart(2, "0")}</b><small>{label}</small>{index < 2 && <i>:</i>}</div>)}</div></div>
      </section>
      <main className="container reference-catalog-main" aria-live="polite">
        {error && <div className="catalog-error">{error}</div>}
        {loading ? <div className="skeleton catalog-loading" /> : filtered.length ? <div className="reference-product-grid">{filtered.map((product) => <ServiceCard product={product} key={product.id} />)}</div> : <div className="empty-state"><Search size={28} className="muted" /><h2 className="h3">Produk tidak ditemukan</h2><p className="muted">Coba gunakan kata kunci atau kategori lain.</p></div>}
      </main>
    </div>
  );
}
