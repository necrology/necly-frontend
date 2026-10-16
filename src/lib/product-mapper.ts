import type { ApiProduct } from "./api";
import type { PriceOption, ProductCategory, SubscriptionProduct } from "./types";

const categoryAliases: Record<string, ProductCategory> = {
  streaming: "Streaming",
  "video streaming": "Streaming",
  productivity: "Produktivitas",
  produktivitas: "Produktivitas",
  creative: "Kreatif",
  kreatif: "Kreatif",
  education: "Edukasi",
  edukasi: "Edukasi",
  security: "Keamanan",
  "security & vpn": "Keamanan",
  keamanan: "Keamanan",
};

function mapCategory(product: ApiProduct): ProductCategory {
  const category = typeof product.category === "string" ? product.category : product.category?.name;
  return categoryAliases[(category ?? "").toLocaleLowerCase("id-ID")] ?? "Produktivitas";
}

function durationLabel(days: number) {
  if (days === 30) return "1 bulan";
  if (days === 90) return "3 bulan";
  if (days === 180) return "6 bulan";
  if (days === 365) return "12 bulan";
  return `${days} hari`;
}

/**
 * Stok per harga datang sebagai `available_slots` — jumlah baris
 * `inventory_slots` berstatus `available` untuk harga itu, dan itulah yang
 * diperiksa backend saat checkout (checkout.go: `price.SlotCount < quantity`
 * → ErrOutOfStock). Katalog tidak pernah mengirim `stock`, jadi membaca
 * `price.stock` saja selalu menghasilkan nol: seluruh etalase akan tampil
 * "Stok habis" walaupun slotnya ada.
 */
function priceStock(price: NonNullable<ApiProduct["prices"]>[number]) {
  return price.available_slots ?? price.stock ?? 0;
}

function mapPriceOption(price: NonNullable<ApiProduct["prices"]>[number]): PriceOption {
  const days = price.duration?.days ?? price.duration_days ?? 30;
  return {
    id: price.id,
    label: durationLabel(days),
    duration: `${days} hari`,
    days,
    price: price.amount,
    stock: priceStock(price),
  };
}

export function mapApiProduct(product: ApiProduct): SubscriptionProduct {
  const priceOptions = (product.prices ?? [])
    .filter((price) => price.active !== false)
    .map(mapPriceOption)
    .sort((left, right) => left.days - right.days || left.price - right.price);
  const primaryPrice = priceOptions[0];
  const category = mapCategory(product);
  // Ketersediaan tingkat produk adalah gabungan seluruh paketnya, karena stok
  // dicatat per harga. Sebelumnya nilai ini selalu 0 (lihat priceStock),
  // sehingga kartu katalog menulis "Stok Terbatas" untuk semua produk.
  const stock = product.stock ?? priceOptions.reduce((sum, option) => sum + (option.stock ?? 0), 0);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    eyebrow: "Akun sharing hemat",
    category,
    price: primaryPrice?.price ?? 0,
    stock,
    duration: primaryPrice?.duration ?? "Belum tersedia",
    summary: product.description,
    description: product.description,
    accessType: category === "Streaming" ? "Undangan anggota" : "Kursi tim",
    benefits: [
      "Slot akun langganan untuk dipakai bersama",
      "Biaya lebih hemat dibanding membeli paket penuh sendiri",
      "Masa akses tercatat di pesanan",
    ],
    activationSteps: [
      { title: "Pilih paket", description: "Pilih durasi dan jumlah slot yang tersedia." },
      { title: "Selesaikan pembayaran", description: "Bayar melalui kanal pembayaran yang tersedia." },
      { title: "Terima akses", description: "Tim Necly mengirim undangan anggota atau kursi tim ke akun Anda." },
    ],
    operator: {
      name: "Tim Akses Necly",
      role: "Pengelola akses",
      initials: "NA",
    },
    accent: category === "Streaming" ? "indigo" : category === "Kreatif" ? "violet" : category === "Keamanan" ? "blue" : "sky",
    featured: false,
    priceOptions,
    termsNote: "Akses diberikan melalui undangan anggota atau kursi resmi sesuai ketentuan penyedia.",
  };
}
