import type {
  ApiCategory,
  ApiInventoryAccount,
  ApiInventorySlot,
  ApiOrder,
  ApiProduct,
  ApiProductPrice,
  ApiUser,
} from "./api";
import { cleanProductName, cleanSlotCopy, mapProductCategory } from "./product-mapper";
import type {
  DashboardOrder,
  Customer,
  Payment,
  Voucher,
  AuditRecord,
  InventoryAccount,
  SubscriptionProduct,
} from "./types";
import { orderStatusLabel } from "./order-status";

export function mapApiDashboard(data: Record<string, unknown>) {
  // Backend hanya mengirim nol ketika query berhasil dan memang kosong. Field
  // yang tidak ada berarti respons tidak sesuai kontrak, jadi jangan diterjemahkan
  // menjadi nol palsu di dashboard.
  const metric = (key: string) => {
    const value = data[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Metrik dashboard "${key}" tidak tersedia`);
    }
    return value;
  };

  // Validasi seluruh DTO C-06, bukan hanya empat field yang tampil, supaya
  // respons parsial tidak lolos sebagai data sah.
  const required = [
    "total_users",
    "total_orders",
    "total_revenue",
    "pending_orders",
    "active_users",
    "new_users_today",
    "orders_today",
    "revenue_today",
    "active_activations",
    "available_slots",
  ] as const;
  const values = Object.fromEntries(required.map((key) => [key, metric(key)]));

  return {
    grossRevenue: values.total_revenue,
    newOrders: values.orders_today,
    activeActivations: values.active_activations,
    availableSlots: values.available_slots,
  };
}

export function mapApiOrderToDashboardOrder(apiOrder: ApiOrder): DashboardOrder {
  const items = apiOrder.items ?? [];
  const firstItem = items[0];
  const dueDate = apiOrder.payment_due_at
    ? new Date(apiOrder.payment_due_at).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const createdDate = apiOrder.created_at
    ? new Date(apiOrder.created_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return {
    // `id` tetap nomor pesanan yang dibaca operator; `apiId` adalah UUID yang
    // dipakai route detail dan API admin.
    id: apiOrder.number,
    apiId: apiOrder.id,
    customer: apiOrder.customer?.name ?? "—",
    customerEmail: apiOrder.customer?.email ?? "—",
    product: firstItem?.product_name ?? "—",
    service: firstItem?.product_name ?? "—",
    duration: firstItem?.duration_name ?? "—",
    amount: apiOrder.total,
    // Semua status backend dipetakan lewat satu sumber (C-02), bukan default
    // "Menunggu pembayaran" yang menyesatkan status tak dikenal.
    status: orderStatusLabel(apiOrder.status),
    date: createdDate,
    due: dueDate,
  };
}

export function mapApiUserToCustomer(apiUser: ApiUser): Customer {
  const roleMap: Record<string, Customer["role"]> = {
    customer: "Pelanggan",
    seller: "Penjual",
    admin: "Admin",
  };

  const verified = Boolean(apiUser.email_verified_at);
  // Endpoint admin mengirim `active` sebagai boolean. Sebelumnya status selalu
  // di-hard-code "Aktif" sehingga user nonaktif tampak aktif di dashboard.
  const status: Customer["status"] = apiUser.active === false ? "Nonaktif" : verified ? "Aktif" : "Baru";

  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    initials: apiUser.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
    orders: 0,
    spend: 0,
    status,
    role: roleMap[apiUser.role] ?? "Pelanggan",
    verified,
    joined: apiUser.created_at
      ? new Date(apiUser.created_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
  };
}

export function mapApiProductToSubscriptionProduct(apiProduct: ApiProduct): SubscriptionProduct {
  const primaryPrice = apiProduct.prices?.[0];
  const priceOptions = (apiProduct.prices ?? [])
    .filter((p) => p.active !== false)
    .map((price) => ({
      id: price.id,
      label: price.duration_name ?? `${price.duration_days ?? price.duration?.days ?? 30} hari`,
      duration: `${price.duration_days ?? price.duration?.days ?? 30} hari`,
      days: price.duration_days ?? price.duration?.days ?? 30,
      price: price.amount,
      // Katalog mengirim ketersediaan per harga sebagai `available_slots`
      // (jumlah slot berstatus available); `stock` tidak pernah ada.
      stock: price.available_slots ?? price.stock ?? 0,
    }))
    .sort((a, b) => a.days - b.days || a.price - b.price);

  const mappedCategory = mapProductCategory(apiProduct);
  const categoryId =
    apiProduct.category_id ??
    (typeof apiProduct.category === "object" ? apiProduct.category?.id : undefined);

  return {
    id: apiProduct.id,
    slug: apiProduct.slug,
    name: cleanProductName(apiProduct.name),
    eyebrow: "Akun sharing hemat",
    category: mappedCategory,
    categoryId,
    price: primaryPrice?.amount ?? 0,
    stock: apiProduct.stock ?? priceOptions.reduce((sum, option) => sum + (option.stock ?? 0), 0),
    duration: primaryPrice?.duration_name ?? "Belum tersedia",
    summary: cleanSlotCopy(apiProduct.description),
    description: cleanSlotCopy(apiProduct.description),
    accessType: mappedCategory === "Streaming" ? "Undangan anggota" : "Kursi tim",
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
    accent: mappedCategory === "Streaming" ? "indigo" : mappedCategory === "Kreatif" ? "violet" : mappedCategory === "Keamanan" ? "blue" : "sky",
    featured: false,
    imageUrl: apiProduct.image_url?.trim() || undefined,
    iconUrl: apiProduct.icon_url?.trim() || undefined,
    comingSoon: apiProduct.coming_soon === true,
    active: apiProduct.active !== false,
    priceOptions,
    termsNote: "Akses diberikan melalui undangan anggota atau kursi resmi sesuai ketentuan penyedia.",
  };
}

export function mapApiCategory(apiCategory: ApiCategory) {
  return {
    id: apiCategory.id,
    name: apiCategory.name,
    slug: apiCategory.slug,
    description: apiCategory.description,
    active: apiCategory.active ?? true,
  };
}

export function mapApiVoucher(apiVoucher: Record<string, unknown>): Voucher {
  const rawType = String(apiVoucher.type ?? "");
  const endsAt = typeof apiVoucher.ends_at === "string" ? apiVoucher.ends_at : "";
  const parsedEnd = endsAt ? new Date(endsAt) : null;
  return {
    id: typeof apiVoucher.id === "string" ? apiVoucher.id : undefined,
    code: String(apiVoucher.code ?? ""),
    // Backend memakai "percentage"/"fixed"; sebelumnya nilai ini dibiarkan
    // mentah sehingga kolom Tipe selalu jatuh ke "Persen".
    type: rawType === "fixed" ? "Nominal" : "Persen",
    value: typeof apiVoucher.value === "number" ? apiVoucher.value : 0,
    // Domain voucher belum menyimpan jumlah penukaran; jangan tampilkan 0 palsu.
    uses: typeof apiVoucher.uses === "number" ? apiVoucher.uses : null,
    limit: typeof apiVoucher.usage_limit === "number" ? apiVoucher.usage_limit : 0,
    expires:
      parsedEnd && !Number.isNaN(parsedEnd.getTime())
        ? parsedEnd.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
    active: apiVoucher.active === true,
  };
}

export type ManagedAccount = {
  id: string;
  productId: string;
  productName: string;
  label: string;
  status: string;
  expiresAt: string | null;
  /** `null` berarti tanpa batas waktu; `0` berarti sudah kedaluwarsa. */
  daysRemaining: number | null;
  sharingLimit: number;
  totalSlots: number;
  availableSlots: number;
  usedSlots: number;
  remainingSlots: number;
  assignedUsers: number;
  otpConfigured: boolean;
  /** Email akun dari API, aman ditampilkan (bukan password). */
  accountEmail: string | null;
  /** Status inbox OTP Gmail: direct = siap, central = mailbox pusat, none = belum. */
  otpInboxConfigured: boolean;
  otpInboxSource: "direct" | "central" | "none";
  mailboxAppPasswordConfigured: boolean;
  needsReview: boolean;
  sellable: boolean;
};

export type ManagedSlot = {
  id: string;
  productPriceId: string;
  status: string;
  name: string | null;
  email: string | null;
  orderId: string | null;
  orderNumber: string | null;
  /** Identitas user pemilik slot, dipakai untuk menggabungkan user yang sama. */
  reservedBy: string | null;
  paymentStatus: string | null;
  activatedAt: string | null;
  accessExpiresAt: string | null;
  /** Sisa masa akses pembeli; `null` bila slot belum pernah aktif. */
  daysRemaining: number | null;
  reservedUntil: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function daysUntil(value: string | null | undefined, now: Date): number | null {
  if (!value) return null;
  const expires = new Date(value);
  if (Number.isNaN(expires.getTime())) return null;
  return Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86_400_000));
}

/**
 * Normalisasi akun inventaris untuk halaman Manajemen akun. Backend NEC-96
 * sudah mengirim field turunan; fallback lokal hanya untuk payload lama supaya
 * tabel tidak menampilkan angka palsu saat field baru belum ada.
 */
export function mapApiInventoryAccountToManaged(
  account: ApiInventoryAccount,
  productName?: string,
  now: Date = new Date(),
): ManagedAccount {
  const sharingLimit = account.sharing_limit ?? 1;
  const totalSlots = account.total_slots ?? 0;
  const availableSlots = account.available_slots ?? 0;
  const usedSlots = account.used_slots ?? Math.max(totalSlots - availableSlots, 0);
  const remainingSlots = account.remaining_slots ?? Math.max(sharingLimit - totalSlots, 0);
  const expiresAt = account.expires_at ?? null;
  const daysRemaining =
    typeof account.days_remaining === "number" ? account.days_remaining : daysUntil(expiresAt, now);
  const rawInboxSource = account.otp_inbox_source;
  const otpInboxSource: ManagedAccount["otpInboxSource"] =
    rawInboxSource === "direct" || rawInboxSource === "central" || rawInboxSource === "none"
      ? rawInboxSource
      : account.otp_inbox_configured === true
        ? "direct"
        : "none";

  return {
    id: account.id,
    productId: account.product_id,
    productName: account.product?.name?.trim() || productName?.trim() || "Produk tidak dikenal",
    label: (account.label ?? "").trim() || "Akun inventaris",
    status: account.status,
    expiresAt,
    daysRemaining,
    sharingLimit,
    totalSlots,
    availableSlots,
    usedSlots,
    remainingSlots,
    assignedUsers: account.assigned_users ?? usedSlots,
    otpConfigured: account.otp_configured === true,
    accountEmail: account.account_email?.trim() || null,
    otpInboxConfigured: otpInboxSource !== "none",
    otpInboxSource,
    mailboxAppPasswordConfigured: account.mailbox_app_password_configured === true,
    // Akun lama di atas lima pengguna tetap ditandai meskipun backend lama
    // belum mengirim `needs_review`.
    needsReview: account.needs_review === true || sharingLimit > 5 || totalSlots > 5,
    sellable: account.sellable ?? (account.status === "active" && (daysRemaining === null || daysRemaining > 0)),
  };
}

/** Normalisasi assignment slot tanpa pernah menyentuh kredensial akun. */
export function mapApiInventorySlotAssignment(slot: ApiInventorySlot, now: Date = new Date()): ManagedSlot {
  const accessExpiresAt = slot.access_expires_at ?? null;
  return {
    id: slot.id,
    productPriceId: slot.product_price_id,
    status: slot.status,
    name: slot.reserved_name?.trim() || null,
    email: slot.reserved_email?.trim() || null,
    orderId: slot.order_id ?? null,
    orderNumber: slot.order_number ?? null,
    reservedBy: slot.reserved_by ?? null,
    paymentStatus: slot.payment_status ?? null,
    activatedAt: slot.activated_at ?? null,
    accessExpiresAt,
    daysRemaining:
      typeof slot.days_remaining === "number" ? slot.days_remaining : daysUntil(accessExpiresAt, now),
    reservedUntil: slot.reserved_until ?? null,
    createdAt: slot.created_at ?? null,
    updatedAt: slot.updated_at ?? null,
  };
}

const paymentStatusLabels: Record<string, Payment["status"]> = {
  paid: "Berhasil",
  pending: "Menunggu",
  refunded: "Dikembalikan",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

/**
 * Flatten satu payment milik pesanan admin menjadi baris tabel pembayaran.
 * Endpoint /admin/payments mengirim pesanan+payments, bukan payment datar.
 */
export function mapApiOrderPayment(order: ApiOrder, payment: NonNullable<ApiOrder["payments"]>[number]): Payment {
  const paidAt = payment.paid_at ?? payment.created_at;
  return {
    id: payment.id,
    orderId: order.number,
    customer: order.customer?.name ?? "—",
    method: payment.provider || "—",
    amount: payment.amount,
    status: paymentStatusLabels[payment.status] ?? payment.status,
    date: paidAt
      ? new Date(paidAt).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
  };
}

// Status dari API ditulis huruf kecil ("active"); tampilan dashboard memakai
// bahasa Indonesia, jadi diterjemahkan di sini alih-alih dibiarkan apa adanya.
const inventoryStatusLabels: Record<string, InventoryAccount["status"]> = {
  active: "Aktif",
  full: "Hampir penuh",
  expired: "Kedaluwarsa",
};

export function mapApiInventoryAccount(apiAccount: Record<string, unknown>): InventoryAccount {
  return {
    id: (apiAccount.id as string) ?? "",
    // Model mengirim product_id; "product" dan "reference" tidak pernah ada di
    // payload, sehingga pemetaan lama selalu menghasilkan string kosong dan
    // dashboard tidak bisa menghubungkan akun dengan produknya.
    product: (apiAccount.product_id as string) ?? (apiAccount.product as string) ?? "",
    reference: (apiAccount.reference as string) ?? "",
    totalSlots: (apiAccount.total_slots as number) ?? 0,
    usedSlots: (apiAccount.used_slots as number) ?? 0,
    status: inventoryStatusLabels[String(apiAccount.status ?? "").toLowerCase()] ?? "Aktif",
    expires: (apiAccount.expires_at as string) ?? new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
  };
}

export function mapApiAuditLog(apiLog: Record<string, unknown>): AuditRecord {
  const value = (key: string) => (typeof apiLog[key] === "string" ? (apiLog[key] as string) : "");
  const id = value("id");
  const action = value("action");
  const resourceType = value("resource_type");
  const createdAt = value("created_at");

  if (!id || !action || !resourceType || !createdAt || typeof apiLog.ip_address !== "string") {
    throw new Error("DTO audit log tidak lengkap");
  }

  const actorUser = apiLog.actor_user as { name?: unknown } | null | undefined;
  const actorName = typeof actorUser?.name === "string" && actorUser.name ? actorUser.name : "—";
  const resourceId = value("resource_id");

  return {
    id,
    actor: actorName,
    action,
    resource: resourceId ? `${resourceType} · ${resourceId}` : resourceType,
    ip: value("ip_address"),
    time: createdAt,
  };
}

export function mapApiPayment(apiPayment: Record<string, unknown>): Payment {
  return {
    id: (apiPayment.id as string) ?? "",
    orderId: (apiPayment.order_id as string) ?? "",
    customer: (apiPayment.customer as string) ?? "",
    method: (apiPayment.method as Payment["method"]) ?? "Virtual account",
    amount: (apiPayment.amount as number) ?? 0,
    status: (apiPayment.status as Payment["status"]) ?? "Menunggu",
    date: (apiPayment.created_at as string)
      ? new Date(apiPayment.created_at as string).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
}