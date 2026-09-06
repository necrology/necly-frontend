"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ServiceCard } from "@/components/service-card";
import { categories, services, getService, type SubscriptionProduct } from "@/data/seed";
import { filterProducts } from "@/lib/catalog";
import { formatIDR } from "@/lib/money";
import { catalogApi, DEMO_MODE } from "@/lib/api";
import { mapApiProduct } from "@/lib/product-mapper";

type ProductsClientProps = { initialCategory?: string };

export function ProductsClient({ initialCategory = "Semua" }: ProductsClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(categories.includes(initialCategory as never) ? initialCategory : "Semua");
  const [maxPrice, setMaxPrice] = useState(1_000_000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [loading, setLoading] = useState(false);
  const [apiProducts, setApiProducts] = useState<SubscriptionProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      let cancelled = false;
      // Schedule initial loading state to avoid sync setState in effect body
      Promise.resolve().then(() => {
        if (!cancelled) setLoading(true);
      });
      catalogApi
        .listProducts({ category: category === "Semua" ? undefined : category })
        .then((res) => {
          if (!cancelled) {
            setApiProducts(res.products.map(mapApiProduct));
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError("Gagal memuat dari API. Gunakan mode demo atau coba lagi.");
            console.error(err);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }
  }, [category]);

  const sourceProducts = useMemo(() => (DEMO_MODE || apiProducts === null ? services : apiProducts), [apiProducts]);

  const filtered = useMemo(() => {
    const result = filterProducts(sourceProducts, { query, category, maxPrice, inStockOnly });
    return [...result].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }, [query, category, maxPrice, inStockOnly, sort, sourceProducts]);

  const reset = () => {
    setQuery("");
    setCategory("Semua");
    setMaxPrice(1_000_000);
    setInStockOnly(false);
    setSort("featured");
  };

  return (
    <div className="container catalog-layout">
      <aside className="filter-panel" aria-label="Filter katalog">
        <div className="filter-group">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="filter-title">Kategori</h2>
            <SlidersHorizontal size={14} className="muted" />
          </div>
          {categories.map((item) => (
            <label className="filter-option" key={item}>
              <span><input type="radio" name="category" checked={category === item} onChange={() => setCategory(item)} /> &nbsp;{item}</span>
              <span>{item === "Semua" ? services.length : services.filter((product) => product.category === item).length}</span>
            </label>
          ))}
        </div>
        <div className="filter-group">
          <h2 className="filter-title">Harga maksimum</h2>
          <strong className="tabular" style={{ fontSize: 12 }}>{formatIDR(maxPrice)}</strong>
          <input className="range" type="range" min={20_000} max={1_000_000} step={10_000} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} aria-label="Harga maksimum" />
          <div style={{ display: "flex", justifyContent: "space-between" }} className="muted small"><span>Rp20k</span><span>Rp1jt</span></div>
        </div>
        <label className="check-row"><input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} /><span>Slot tersedia sekarang</span></label>
        <button className="button button-secondary button-sm" type="button" onClick={reset}><RotateCcw size={13} /> Reset filter</button>
      </aside>

      <section className="catalog-main" aria-live="polite">
        <div className="catalog-toolbar">
          <div className="input-wrap"><Search size={15} /><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau manfaat layanan" aria-label="Cari layanan" /></div>
          <select className="select" style={{ width: 180 }} value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Urutkan layanan">
            <option value="featured">Unggulan dulu</option>
            <option value="price-low">Harga terendah</option>
            <option value="price-high">Harga tertinggi</option>
          </select>
        </div>
        <div className="catalog-subbar"><span><strong style={{ color: "var(--ink)" }}>{filtered.length}</strong> produk ditemukan</span><span>Undangan resmi · Stok slot</span></div>
        {error && <div className="demo-banner" style={{ marginBottom: 12 }}><span>{error}</span></div>}
        {loading && <div className="skeleton" style={{ width: "100%", height: 200, borderRadius: 7 }} />}
        {filtered.length ? (
          <div className="service-grid">{filtered.map((product) => <ServiceCard product={product} key={product.id} />)}</div>
        ) : (
          <div className="empty-state"><Search size={28} className="muted" /><h2 className="h3">Tidak ada produk cocok</h2><p className="muted" style={{ margin: 0 }}>Coba kategori lebih luas, batas harga, atau kata kunci lain.</p><button className="button button-secondary" type="button" onClick={reset}>Reset katalog</button></div>
        )}
      </section>
    </div>
  );
}