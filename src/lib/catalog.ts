export type CatalogProduct = {
  name: string;
  category: string;
  /** Nama kategori asli API; dipakai filter agar kategori baru tidak jatuh ke kategori lama. */
  categoryName?: string;
  price: number;
  stock: number;
};

export type CatalogFilters = {
  category: string;
  maxPrice: number;
  inStockOnly: boolean;
  query: string;
};

export function filterProducts<T extends CatalogProduct>(
  products: readonly T[],
  filters: CatalogFilters,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return products.filter((product) => {
    const matchesQuery = !query || product.name.toLocaleLowerCase().includes(query);
    const matchesCategory =
      !filters.category ||
      filters.category === "All" ||
      filters.category === "Semua" ||
      (product.categoryName?.trim() || product.category) === filters.category;
    const matchesPrice = product.price <= filters.maxPrice;
    const matchesStock = !filters.inStockOnly || product.stock > 0;

    return matchesQuery && matchesCategory && matchesPrice && matchesStock;
  });
}
