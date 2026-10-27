import type { ApiProduct } from "./api";
import { mapApiProduct } from "./product-mapper";
import type { CartItem } from "@/stores/cart-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_PRODUCT_SLUGS: Record<string, string> = {
  "spotify-premium": "spotify-premium-individual",
  "microsoft-365": "microsoft-365-personal",
  "disney-plus-hotstar": "disney-plus-standard",
};

export const cartLineKey = (item: Pick<CartItem, "id" | "product_price_id">) => item.product_price_id ?? item.id;

function durationDays(label?: string) {
  const match = /(\d+)\s*(bulan|hari|days?|months?)/i.exec(label ?? "");
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return /bulan|month/i.test(match[2]) ? value * 30 : value;
}

function productMatches(item: CartItem, product: ReturnType<typeof mapApiProduct>) {
  if (item.id === product.id || item.slug === product.slug) return true;

  const oldSlug = item.slug.toLocaleLowerCase("id-ID");
  const currentSlug = product.slug.toLocaleLowerCase("id-ID");
  if (oldSlug.length >= 5 && (currentSlug.startsWith(`${oldSlug}-`) || oldSlug.startsWith(`${currentSlug}-`))) return true;
  return LEGACY_PRODUCT_SLUGS[oldSlug] === currentSlug;
}

export type CartIssueReason = "unavailable" | "stock_exceeded" | "price_changed" | "quantity_adjusted" | "updated";

export type CartIssue = {
  key: string;
  name: string;
  reason: CartIssueReason;
};

export type CartReconciliation = {
  items: CartItem[];
  changed: boolean;
  unresolved: number;
  issues: CartIssue[];
  previousSubtotal: number;
  currentSubtotal: number;
};

function subtotal(items: readonly CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Refresh harga/stok dan migrasikan id lama dari katalog tersimpan.
 *
 * Aturan penting untuk live mode: id harga ber-UUID harus cocok persis. Bila
 * harga itu hilang atau tidak aktif, baris ditandai tidak tersedia — tidak
 * boleh diam-diam dipindahkan ke paket lain dengan durasi mirip, karena itu
 * bisa mengubah jumlah yang ditagih.
 */
export function reconcileCartItems(items: CartItem[], catalog: ApiProduct[]): CartReconciliation {
  const products = catalog.map(mapApiProduct);
  const issues: CartIssue[] = [];
  let changed = false;
  let unresolved = 0;

  // Pass pertama: cocokkan setiap baris ke harga live. Pass kedua baru boleh
  // memeriksa stok setelah permintaan per product_price_id diagregasi, karena
  // dua baris duplikat masing-masing bisa lolos batas stok secara individual.
  const resolved = items.map((item) => {
    const key = cartLineKey(item);
    const hasPriceID = UUID.test(item.product_price_id ?? "");
    const product = products.find((candidate) =>
      candidate.priceOptions.some((option) => option.id === item.product_price_id),
    ) ?? (hasPriceID ? undefined : products.find((candidate) => productMatches(item, candidate)));

    const wantedDays = durationDays(item.selectedDuration);
    const option = product
      ? (hasPriceID
          ? product.priceOptions.find((candidate) => candidate.id === item.product_price_id)
          : product.priceOptions.find((candidate) => wantedDays === null || Math.abs(candidate.days - wantedDays) <= 1))
      : undefined;

    return { item, key, product, option };
  });

  const requestedByPrice = new Map<string, number>();
  for (const entry of resolved) {
    if (!entry.option) continue;
    requestedByPrice.set(entry.option.id, (requestedByPrice.get(entry.option.id) ?? 0) + entry.item.quantity);
  }

  const reconciled = resolved.map(({ item, key, product, option }) => {
    const availableStock = option?.stock ?? 0;
    if (!product || !option || availableStock < 1 || !UUID.test(option.id)) {
      unresolved += 1;
      issues.push({ key, name: item.name, reason: "unavailable" });
      return item;
    }

    const requested = requestedByPrice.get(option.id) ?? item.quantity;
    if (requested > availableStock) {
      unresolved += 1;
      issues.push({ key, name: item.name, reason: "stock_exceeded" });
      return item;
    }

    if (option.price !== item.price) {
      issues.push({ key, name: item.name, reason: "price_changed" });
    }

    const next: CartItem = {
      ...item,
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      categoryName: product.categoryName,
      price: option.price,
      stock: availableStock,
      accessType: product.accessType,
      product_price_id: option.id,
      selectedDuration: option.duration,
      selectedPrice: option.price,
      selectedStock: availableStock,
    };

    if (JSON.stringify(next) !== JSON.stringify(item)) changed = true;
    return next;
  });

  return {
    items: reconciled,
    changed,
    unresolved,
    issues,
    previousSubtotal: subtotal(items),
    currentSubtotal: subtotal(reconciled),
  };
}
