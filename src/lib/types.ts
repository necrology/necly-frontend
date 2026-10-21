import type { OrderStatusLabel } from "./order-status";

export type ProductCategory =
  | "Streaming"
  | "Produktivitas"
  | "Kreatif"
  | "Edukasi"
  | "Keamanan";

export type PriceOption = {
  id: string;
  label: string;
  duration: string;
  days: number;
  price: number;
  stock?: number;
};

export type SubscriptionProduct = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  category: ProductCategory;
  /** ID kategori asli dari API, dipakai form admin agar edit tidak memindahkan kategori. */
  categoryId?: string;
  price: number;
  stock: number;
  duration: string;
  summary: string;
  description: string;
  accessType: "Undangan anggota" | "Kursi tim";
  benefits: string[];
  activationSteps: { title: string; description: string }[];
  operator: {
    name: string;
    role: string;
    initials: string;
  };
  accent: "sky" | "blue" | "indigo" | "violet";
  featured?: boolean;
  /** Foto produk dari `image_url`; kosong berarti pakai ilustrasi bawaan. */
  imageUrl?: string;
  /** Produk tetap tampil di katalog, tetapi tidak dapat dipesan. */
  comingSoon?: boolean;
  /** Status publikasi dari API. Dihilangkan hanya untuk data demo lama. */
  active?: boolean;
  priceOptions: PriceOption[];
  termsNote: string;
};

/** @deprecated Use SubscriptionProduct. Kept for component compatibility. */
export type Service = SubscriptionProduct;

export type DashboardOrderStatus = OrderStatusLabel | "Aktif";

export type DashboardOrder = {
  id: string;
  /** UUID dari API; `id` tetap nomor pesanan untuk ditampilkan. */
  apiId?: string;
  customer: string;
  customerEmail: string;
  product: string;
  service: string;
  duration: string;
  amount: number;
  status: DashboardOrderStatus;
  date: string;
  due: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  initials: string;
  orders: number;
  spend: number;
  status: "Aktif" | "Baru" | "Nonaktif";
  role: "Pelanggan" | "Penjual" | "Admin";
  verified: boolean;
  joined: string;
};

export type Payment = {
  id: string;
  orderId: string;
  customer: string;
  /** Nama penyedia/kanal apa adanya dari API (mis. "xendit"). */
  method: string;
  amount: number;
  status: "Berhasil" | "Menunggu" | "Dikembalikan" | string;
  date: string;
};

export type Voucher = {
  /** ID server; seed demo tidak memilikinya. */
  id?: string;
  code: string;
  type: "Persen" | "Nominal";
  value: number;
  /** null berarti API tidak mengirim jumlah penukaran. */
  uses: number | null;
  limit: number;
  expires: string;
  active: boolean;
};

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  type: "order" | "inventory" | "payment" | "system";
  time: string;
  read: boolean;
};

export type AuditRecord = {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip: string;
  time: string;
};

export type InventoryAccount = {
  id: string;
  product: string;
  reference: string;
  totalSlots: number;
  usedSlots: number;
  status: "Aktif" | "Hampir penuh" | "Kedaluwarsa";
  expires: string;
};

export type AssetRecord = {
  id: string;
  name: string;
  kind: "Logo" | "Spanduk" | "Gambar mini";
  size: string;
  usedBy: string;
  updated: string;
};

