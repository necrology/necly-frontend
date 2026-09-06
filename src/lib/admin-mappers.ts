import type { ApiOrder, ApiUser, ApiProduct, ApiCategory, ApiProductPrice } from "./api";
import type {
  DashboardOrder,
  Customer,
  Payment,
  Voucher,
  NotificationItem,
  AuditRecord,
  InventoryAccount,
  SubscriptionProduct,
} from "./types";
import { formatIDR } from "./money";

export function mapApiDashboard(data: Record<string, unknown>) {
  return {
    grossRevenue: (data.gross_revenue as number) ?? 0,
    newOrders: (data.new_orders as number) ?? 0,
    activeActivations: (data.active_activations as number) ?? 0,
    availableSlots: (data.available_slots as number) ?? 0,
    recentOrders: (((data.recent_orders as unknown[]) ?? []) as ApiOrder[]).map(mapApiOrderToDashboardOrder),
  };
}

export function mapApiOrderToDashboardOrder(apiOrder: ApiOrder): DashboardOrder {
  const statusMap: Record<string, DashboardOrder["status"]> = {
    pending: "Menunggu pembayaran",
    paid: "Dibayar",
    processing: "Diproses",
    active: "Aktif",
    cancelled: "Dibatalkan",
    expired: "Dibatalkan",
    refunded: "Dibatalkan",
  };

  const status = statusMap[apiOrder.status.toLowerCase()] ?? "Menunggu pembayaran";

  const dueDate = apiOrder.payment_due_at
    ? new Date(apiOrder.payment_due_at).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const createdDate = new Date(apiOrder.created_at).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return {
    id: apiOrder.number,
    customer: apiOrder.items[0]?.product_name ?? "—",
    customerEmail: "—",
    product: apiOrder.items[0]?.product_name ?? "—",
    service: apiOrder.items[0]?.product_name ?? "—",
    duration: apiOrder.items[0]?.duration_name ?? "—",
    amount: apiOrder.total,
    status,
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
      stock: price.stock ?? 0,
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
    stock: apiProduct.stock ?? primaryPrice?.stock ?? 0,
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

export function mapApiInventoryAccount(apiAccount: Record<string, unknown>): InventoryAccount {
  return {
    id: (apiAccount.id as string) ?? "",
    product: (apiAccount.product as string) ?? "",
    reference: (apiAccount.reference as string) ?? "",
    totalSlots: (apiAccount.total_slots as number) ?? 0,
    usedSlots: (apiAccount.used_slots as number) ?? 0,
    status: (apiAccount.status as InventoryAccount["status"]) ?? "Aktif",
    expires: (apiAccount.expires_at as string) ?? new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
  };
}

export function mapApiAuditLog(apiLog: Record<string, unknown>): AuditRecord {
  return {
    id: (apiLog.id as string) ?? "",
    actor: (apiLog.actor as string) ?? "",
    action: (apiLog.action as string) ?? "",
    resource: (apiLog.resource as string) ?? "",
    ip: (apiLog.ip as string) ?? "",
    time: (apiLog.created_at as string) ?? new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
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