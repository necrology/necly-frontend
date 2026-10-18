import type { ApiOrder, ApiUser, ApiProduct, ApiCategory, ApiProductPrice } from "./api";
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

  const statusMap: Record<string, Customer["status"]> = {
    active: "Aktif",
    new: "Baru",
    inactive: "Nonaktif",
    suspended: "Nonaktif",
  };

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
    status: "Aktif",
    role: roleMap[apiUser.role] ?? "Pelanggan",
    verified: apiUser.email_verified_at !== null,
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
  const categoryMap: Record<string, SubscriptionProduct["category"]> = {
    Streaming: "Streaming",
    Productivity: "Produktivitas",
    Creative: "Kreatif",
    Education: "Edukasi",
    Security: "Keamanan",
  };

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

  const category = typeof apiProduct.category === "string" ? apiProduct.category : apiProduct.category?.name ?? "Produktivitas";
  const mappedCategory = categoryMap[category] ?? "Produktivitas";

  return {
    id: apiProduct.id,
    slug: apiProduct.slug,
    name: apiProduct.name,
    eyebrow: "Akun sharing hemat",
    category: mappedCategory,
    price: primaryPrice?.amount ?? 0,
    stock: apiProduct.stock ?? priceOptions.reduce((sum, option) => sum + (option.stock ?? 0), 0),
    duration: primaryPrice?.duration_name ?? "Belum tersedia",
    summary: apiProduct.description,
    description: apiProduct.description,
    accessType: mappedCategory === "Streaming" ? "Undangan anggota" : "Kursi tim",
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
    accent: mappedCategory === "Streaming" ? "indigo" : mappedCategory === "Kreatif" ? "violet" : mappedCategory === "Keamanan" ? "blue" : "sky",
    featured: false,
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
  return {
    code: (apiVoucher.code as string) ?? "",
    type: (apiVoucher.type as "Persen" | "Nominal") ?? "Persen",
    value: (apiVoucher.value as number) ?? 0,
    uses: (apiVoucher.uses as number) ?? 0,
    limit: (apiVoucher.limit as number) ?? 0,
    expires: (apiVoucher.expires_at as string) ?? new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    active: (apiVoucher.active as boolean) ?? false,
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