"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { previewProductSlugs, productCategories, products } from "@/data/products";
import { CommerceOfferBanner } from "@/components/commerce-offer-banner";
import { CommerceProductCard } from "@/components/commerce-product-card";

type ProductSearchBarProps = {
  mode?: "catalog" | "preview";
  limit?: number;
};

export function ProductSearchBar({ mode = "catalog", limit }: ProductSearchBarProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const source = useMemo(() => {
    if (mode !== "preview") return products;
    const rank = (slug: string) => {
      const index = previewProductSlugs.indexOf(slug);
      return index < 0 ? previewProductSlugs.length : index;
    };
    return [...products].sort((a, b) => rank(a.slug) - rank(b.slug));
  }, [mode]);
  const displayed = useMemo(() => source.filter((product) => {
    const normalized = query.toLocaleLowerCase("id-ID");
    const matchesQuery = !normalized || `${product.name} ${product.packageName} ${product.category}`.toLocaleLowerCase("id-ID").includes(normalized);
    const matchesCategory = category === "Semua" || product.category === category;
    return matchesQuery && matchesCategory;
  }).slice(0, limit), [category, limit, query, source]);

  return (
    <section className={`commerce-catalog ${mode === "preview" ? "is-preview" : ""}`}>
      <div className="commerce-catalog-controls">
        <label className="commerce-search-field"><Search size={22} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari Produk..." type="search" aria-label="Cari Produk" /></label>
        <label className="commerce-category-field"><span>{category === "Semua" ? "Semua Kategori" : category}</span><select aria-label="Pilih kategori" value={category} onChange={(event) => setCategory(event.target.value)}>{productCategories.map((item) => <option key={item} value={item}>{item === "Semua" ? "Semua Kategori" : item}</option>)}</select><ChevronDown size={20} /></label>
      </div>
      <CommerceOfferBanner />
      <div className={`commerce-product-grid ${mode === "preview" ? "preview-grid" : ""}`} aria-live="polite">
        {displayed.length ? displayed.map((product) => <CommerceProductCard product={product} compact={mode === "preview"} key={product.id} />) : <div className="commerce-empty-state">Produk tidak ditemukan. Coba kata kunci atau kategori lain.</div>}
      </div>
    </section>
  );
}
