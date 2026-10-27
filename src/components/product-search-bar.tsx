"use client";

import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { previewProductSlugs, productCategories, products, type CommerceProduct } from "@/data/products";
import { CommerceOfferBanner } from "@/components/commerce-offer-banner";
import { CommerceProductCard } from "@/components/commerce-product-card";
import { SearchableSelect } from "@/components/searchable-select";
import { catalogApi, DEMO_MODE } from "@/lib/api";
import { mapApiCommerceProduct } from "@/lib/commerce-product";
import { productCategoryLabel } from "@/lib/product-category";

type ProductSearchBarProps = {
  mode?: "catalog" | "preview";
  limit?: number;
};

const categoryOrder = ["Streaming", "Produktivitas", "Kreatif", "Edukasi", "Keamanan"];

function categoryOptionsFor(items: readonly CommerceProduct[]) {
  const present = new Set(items.map((product) => productCategoryLabel(product)));
  const ordered = categoryOrder.filter((category) => present.has(category as CommerceProduct["category"]));
  const extras = [...present]
    .filter((category) => !categoryOrder.includes(category))
    .sort((left, right) => left.localeCompare(right, "id-ID"));
  return ["Semua", ...ordered, ...extras];
}

export function ProductSearchBar({ mode = "catalog", limit }: ProductSearchBarProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [liveProducts, setLiveProducts] = useState<CommerceProduct[] | null>(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (DEMO_MODE) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    catalogApi
      .listProducts({ per_page: 100 })
      .then((response) => {
        if (cancelled) return;
        // Hanya data live yang dipakai. Data contoh tidak pernah menjadi
        // fallback diam-diam ketika API gagal atau kosong.
        setLiveProducts(response.products.map(mapApiCommerceProduct));
      })
      .catch(() => {
        if (cancelled) return;
        setLiveProducts(null);
        setError("Produk belum dapat dimuat. Silakan coba lagi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const liveSource = useMemo(() => liveProducts ?? [], [liveProducts]);
  const source = useMemo(() => {
    const rank = (slug: string) => {
      const exact = previewProductSlugs.indexOf(slug);
      if (exact >= 0) return exact;
      // Slug live dapat berbeda dari seed (mis. disney-plus-standard vs
      // disney-plus-hotstar), jadi cocokkan juga token brand yang dikurasi.
      const token = previewProductSlugs.findIndex((candidate) => candidate.split("-")[0] === slug.split("-")[0]);
      return token < 0 ? previewProductSlugs.length : token;
    };
    if (!DEMO_MODE) {
      if (mode !== "preview") return liveSource;
      return [...liveSource].sort((left, right) => rank(left.slug) - rank(right.slug));
    }
    if (mode !== "preview") return products;
    return [...products].sort((a, b) => rank(a.slug) - rank(b.slug));
  }, [liveSource, mode]);

  const categoryOptions = useMemo(
    () => (DEMO_MODE ? [...productCategories] : categoryOptionsFor(source)),
    [source],
  );

  // Data live bisa memakai nama kategori yang lebih spesifik; pastikan pilihan
  // yang sudah tidak ada tidak membuat daftar kosong tanpa penjelasan.
  const activeCategory = categoryOptions.includes(category) ? category : "Semua";

  const displayed = useMemo(() => source.filter((product) => {
    const normalized = query.toLocaleLowerCase("id-ID");
    const categoryLabel = productCategoryLabel(product);
    const matchesQuery = !normalized || `${product.name} ${product.packageName} ${categoryLabel}`.toLocaleLowerCase("id-ID").includes(normalized);
    const matchesCategory = activeCategory === "Semua" || categoryLabel === activeCategory;
    return matchesQuery && matchesCategory;
  }).slice(0, limit), [activeCategory, limit, query, source]);

  return (
    <section className={`commerce-catalog ${mode === "preview" ? "is-preview" : ""}`}>
      <div className="commerce-catalog-controls">
        <label className="commerce-search-field"><Search size={22} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari Produk..." type="search" aria-label="Cari Produk" /></label>
        <div className="commerce-category-field is-searchable">
          <SearchableSelect
            ariaLabel="Pilih kategori"
            options={categoryOptions.map((item) => ({ value: item, label: item === "Semua" ? "Semua Kategori" : item }))}
            value={activeCategory}
            onChange={setCategory}
          />
        </div>
      </div>
      <CommerceOfferBanner />
      <div className={`commerce-product-grid ${mode === "preview" ? "preview-grid" : ""}`} aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="commerce-empty-state">Memuat produk…</div>
        ) : error ? (
          <div className="commerce-empty-state" role="alert">
            {error}
            <button className="button button-secondary button-sm" style={{ marginTop: 12 }} type="button" onClick={() => setReloadToken((value) => value + 1)}><RefreshCw size={15} /> Coba lagi</button>
          </div>
        ) : displayed.length ? displayed.map((product) => <CommerceProductCard product={product} compact={mode === "preview"} key={product.id} />) : <div className="commerce-empty-state">Produk tidak ditemukan. Coba kata kunci atau kategori lain.</div>}
      </div>
    </section>
  );
}
