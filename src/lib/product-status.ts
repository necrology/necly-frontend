import type { SubscriptionProduct } from "./types";

export type ProductStatus = "Aktif" | "Coming Soon" | "Nonaktif";

/** Status admin diturunkan dari dua flag backend: `active` dan `coming_soon`. */
export function productStatus(product: Pick<SubscriptionProduct, "active" | "comingSoon">): ProductStatus {
  if (product.active === false) return "Nonaktif";
  if (product.comingSoon === true) return "Coming Soon";
  return "Aktif";
}

/**
 * Kontrak dashboard: status adalah satu pilihan, tetapi API menerima `active`
 * dan `coming_soon` terpisah. Nonaktif selalu mengirim coming_soon=false agar
 * produk yang diaktifkan kembali tidak tiba-tiba berstatus Coming Soon.
 */
export function productStatusPayload(status: ProductStatus): { active: boolean; coming_soon: boolean } {
  return {
    active: status !== "Nonaktif",
    coming_soon: status === "Coming Soon",
  };
}
