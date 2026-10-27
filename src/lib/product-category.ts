/** Satu sumber label kategori: nama asli API, lalu kategori presentasi lama. */
export function productCategoryLabel(product: {
  category?: string;
  categoryName?: string;
}): string {
  return product.categoryName?.trim() || product.category?.trim() || "Lainnya";
}
