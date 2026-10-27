import type { ApiProduct } from "./api";
import type { PriceOption, ProductCategory, SubscriptionProduct } from "./types";

const categoryAliases: Record<string, ProductCategory> = {
  streaming: "Streaming",
  "video streaming": "Streaming",
  "streaming video": "Streaming",
  "streaming musik": "Streaming",
  "music streaming": "Streaming",
  productivity: "Produktivitas",
  produktivitas: "Produktivitas",
  "productivity suites": "Produktivitas",
  "produktivitas bersama": "Produktivitas",
  "cloud storage": "Produktivitas",
  "penyimpanan awan": "Produktivitas",
  creative: "Kreatif",
  kreatif: "Kreatif",
  education: "Edukasi",
  edukasi: "Edukasi",
  security: "Keamanan",
  "security & vpn": "Keamanan",
  keamanan: "Keamanan",
};

function productCategoryName(product: ApiProduct) {
  return typeof product.category === "string" ? product.category : product.category?.name;
}

/**
 * Nama kategori apa adanya dari API. Label UI memakai ini supaya kategori
 * buatan admin (mis. "Streaming Video") tidak berubah menjadi kategori lama.
 */
export function apiProductCategoryName(product: ApiProduct): string | undefined {
  const name = productCategoryName(product)?.trim();
  return name || undefined;
}

export function mapProductCategory(product: ApiProduct): ProductCategory {
  const category = productCategoryName(product);
  return categoryAliases[(category ?? "").toLocaleLowerCase("id-ID")] ?? "Produktivitas";
}

function productCategoryId(product: ApiProduct) {
  if (product.category_id) return product.category_id;
  return typeof product.category === "object" ? product.category?.id : undefined;
}

/**
 * QA baris 88 / NEC-95: nama paket dari katalog masih membawa label internal
 * "Slot Anggota Rumah Tangga", "Slot Anggota", dan kata "Family". Label itu
 * tidak boleh tampil sebagai judul layanan di storefront maupun dashboard.
 */
const internalNameLabels = [
  /\s*[-–—]?\s*slot anggota rumah tangga\s*/gi,
  /\s*[-–—]?\s*slot anggota\s*/gi,
  /\s*[-–—]?\s*slot keluarga\s*/gi,
  /\s*[-–—]?\s*\bslots?\b\s*/gi,
  /\s*[-–—]?\s*\bfamily\b\s*/gi,
];

export function cleanProductName(name: string) {
  const cleaned = internalNameLabels
    .reduce((value, label) => value.replace(label, " "), name)
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, "")
    .trim();
  return cleaned || name.trim();
}

/**
 * Ganti istilah internal "slot" pada teks bebas dari katalog dan buang kata
 * "Family" (termasuk frasa "Family Sharing") agar deskripsi tetap rapi.
 */
export function cleanSlotCopy(text: string) {
  return text
    .replace(/\bfamily\s+sharing\b/gi, "berbagi keluarga")
    .replace(/\bfamily\b\s*/gi, "")
    .replace(/\bslots?\b/gi, (match) => (match[0] === match[0].toUpperCase() ? "Akses" : "akses"))
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
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
    baseAmount: price.base_amount,
    adminFee: price.admin_fee,
    memberSlots: price.member_slots,
    adminIncluded: price.admin_included,
  };
}

export function mapApiProduct(product: ApiProduct): SubscriptionProduct {
  const priceOptions = (product.prices ?? [])
    .filter((price) => price.active !== false)
    .map(mapPriceOption)
    .sort((left, right) => left.days - right.days || left.price - right.price);
  const primaryPrice = priceOptions[0];
  const category = mapProductCategory(product);
  // Ketersediaan tingkat produk adalah gabungan seluruh paketnya, karena stok
  // dicatat per harga. Sebelumnya nilai ini selalu 0 (lihat priceStock),
  // sehingga kartu katalog menulis "Stok Terbatas" untuk semua produk.
  const stock = product.stock ?? priceOptions.reduce((sum, option) => sum + (option.stock ?? 0), 0);

  return {
    id: product.id,
    slug: product.slug,
    name: cleanProductName(product.name),
    eyebrow: "Akun sharing hemat",
    category,
    categoryId: productCategoryId(product),
    categoryName: apiProductCategoryName(product),
    price: primaryPrice?.price ?? 0,
    stock,
    duration: primaryPrice?.duration ?? "Belum tersedia",
    summary: cleanSlotCopy(product.description),
    description: cleanSlotCopy(product.description),
    accessType: category === "Streaming" ? "Undangan anggota" : "Kursi tim",
    benefits: [
      "Akun langganan tersedia untuk dipakai bersama",
      "Biaya lebih hemat dibanding membeli paket penuh sendiri",
      "Masa akses tercatat di pesanan",
    ],
    activationSteps: [
      { title: "Pilih paket", description: "Pilih durasi dan jumlah akses yang tersedia." },
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
    imageUrl: product.image_url?.trim() || undefined,
    iconUrl: product.icon_url?.trim() || undefined,
    comingSoon: product.coming_soon === true,
    active: product.active !== false,
    priceOptions,
    termsNote: "Akses diberikan melalui undangan anggota atau kursi resmi sesuai ketentuan penyedia.",
  };
}
