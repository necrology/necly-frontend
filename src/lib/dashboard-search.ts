import {
  adminApi,
  DEMO_MODE,
  type ApiCategory,
  type ApiOrder,
  type ApiProduct,
  type ApiUser,
} from "@/lib/api";
import { mapApiVoucher } from "@/lib/admin-mappers";
import { formatIDR } from "@/lib/money";
import {
  categories as seedCategories,
  customers as seedCustomers,
  dashboardOrders as seedOrders,
  services as seedProducts,
  vouchers as seedVouchers,
} from "@/data/seed";

export const DASHBOARD_SEARCH_MIN_CHARS = 2;
export const DASHBOARD_SEARCH_LIMIT = 5;
export const DASHBOARD_SEARCH_DEBOUNCE_MS = 250;

export type DashboardSearchKind = "order" | "customer" | "product" | "category" | "voucher";

export type DashboardSearchResult = {
  /** Unik lintas grup, misalnya `order:<uuid>`. */
  id: string;
  kind: DashboardSearchKind;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
};

export type DashboardSearchGroup = {
  kind: DashboardSearchKind;
  label: string;
  results: DashboardSearchResult[];
};

export type DashboardSearchResponse = {
  query: string;
  groups: DashboardSearchGroup[];
  total: number;
};

export const DASHBOARD_SEARCH_LABELS: Record<DashboardSearchKind, string> = {
  order: "Pesanan",
  customer: "Pelanggan",
  product: "Produk",
  category: "Kategori",
  voucher: "Voucher",
};

/** Halaman daftar yang bisa menerima parameter `?search=`. */
export const DASHBOARD_SEARCH_LIST_HREF: Record<DashboardSearchKind, string> = {
  order: "/dashboard/orders",
  customer: "/dashboard/customers",
  product: "/dashboard/products",
  category: "/dashboard/categories",
  voucher: "/dashboard/vouchers",
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

function matches(query: string, ...values: Array<string | null | undefined>) {
  return values.some((value) => typeof value === "string" && normalized(value).includes(query));
}

function limited<T>(values: T[]) {
  return values.slice(0, DASHBOARD_SEARCH_LIMIT);
}

function listHref(kind: DashboardSearchKind, value: string) {
  return `${DASHBOARD_SEARCH_LIST_HREF[kind]}?search=${encodeURIComponent(value)}`;
}

function orderResult(order: ApiOrder): DashboardSearchResult {
  const customer = [order.customer?.name, order.customer?.email].filter(Boolean).join(" · ");
  const products = Array.from(
    new Set((order.items ?? []).map((item) => item.product_name).filter(Boolean)),
  ).join(", ");
  return {
    id: `order:${order.id}`,
    kind: "order",
    title: order.number?.trim() || order.id,
    subtitle: customer || undefined,
    meta: [products, formatIDR(order.total)].filter(Boolean).join(" · ") || undefined,
    href: `/dashboard/orders/${encodeURIComponent(order.id)}`,
  };
}

function customerResult(user: ApiUser): DashboardSearchResult {
  return {
    id: `customer:${user.id}`,
    kind: "customer",
    title: user.name,
    subtitle: user.email,
    meta: user.role === "customer" ? "Pelanggan" : user.role === "seller" ? "Penjual" : "Admin",
    href: listHref("customer", user.email || user.name),
  };
}

function categoryNameOf(product: ApiProduct) {
  if (typeof product.category === "string") return product.category;
  return product.category?.name ?? "";
}

function productResult(product: ApiProduct): DashboardSearchResult {
  const category = categoryNameOf(product);
  return {
    id: `product:${product.id}`,
    kind: "product",
    title: product.name,
    subtitle: category || undefined,
    meta: product.active === false ? "Nonaktif" : product.coming_soon ? "Coming Soon" : undefined,
    href: listHref("product", product.name),
  };
}

function categoryResult(category: ApiCategory): DashboardSearchResult {
  return {
    id: `category:${category.id}`,
    kind: "category",
    title: category.name,
    subtitle: category.slug,
    meta: category.active === false ? "Nonaktif" : undefined,
    href: listHref("category", category.name),
  };
}

function voucherResult(raw: Record<string, unknown>): DashboardSearchResult | null {
  const voucher = mapApiVoucher(raw);
  if (!voucher.code) return null;
  return {
    id: `voucher:${voucher.id ?? voucher.code}`,
    kind: "voucher",
    title: voucher.code,
    subtitle: voucher.type,
    meta: voucher.active ? "Aktif" : "Nonaktif",
    href: listHref("voucher", voucher.code),
  };
}

function group(kind: DashboardSearchKind, results: Array<DashboardSearchResult | null>): DashboardSearchGroup {
  return {
    kind,
    label: DASHBOARD_SEARCH_LABELS[kind],
    results: results.filter((result): result is DashboardSearchResult => result !== null),
  };
}

function response(query: string, groups: DashboardSearchGroup[]): DashboardSearchResponse {
  return {
    query,
    groups: groups.filter((item) => item.results.length > 0),
    total: groups.reduce((total, item) => total + item.results.length, 0),
  };
}

function searchDemo(query: string): DashboardSearchResponse {
  const needle = normalized(query);

  const orders = limited(seedOrders.filter((order) =>
    matches(needle, order.id, order.customer, order.customerEmail, order.product, order.service),
  )).map<DashboardSearchResult>((order) => ({
    id: `order:${order.id}`,
    kind: "order",
    title: order.id,
    subtitle: `${order.customer} · ${order.customerEmail}`,
    meta: [order.service, formatIDR(order.amount)].filter(Boolean).join(" · "),
    href: `/dashboard/orders/${encodeURIComponent(order.id)}`,
  }));

  const customers = limited(seedCustomers.filter((customer) =>
    matches(needle, customer.name, customer.email),
  )).map<DashboardSearchResult>((customer) => ({
    id: `customer:${customer.id}`,
    kind: "customer",
    title: customer.name,
    subtitle: customer.email,
    meta: customer.role,
    href: listHref("customer", customer.email || customer.name),
  }));

  const products = limited(seedProducts.filter((product) =>
    matches(needle, product.name, product.summary, product.description, product.category),
  )).map<DashboardSearchResult>((product) => ({
    id: `product:${product.id}`,
    kind: "product",
    title: product.name,
    subtitle: product.category,
    meta: product.comingSoon ? "Coming Soon" : undefined,
    href: listHref("product", product.name),
  }));

  const categoryNames = seedCategories.filter((category) => category !== "Semua" && matches(needle, category));
  const categories = limited(categoryNames).map<DashboardSearchResult>((category) => ({
    id: `category:${category}`,
    kind: "category",
    title: category,
    href: listHref("category", category),
  }));

  const vouchers = limited(seedVouchers.filter((voucher) => matches(needle, voucher.code)))
    .map<DashboardSearchResult>((voucher) => ({
      id: `voucher:${voucher.id ?? voucher.code}`,
      kind: "voucher",
      title: voucher.code,
      subtitle: voucher.type,
      meta: voucher.active ? "Aktif" : "Nonaktif",
      href: listHref("voucher", voucher.code),
    }));

  return response(query, [
    group("order", orders),
    group("customer", customers),
    group("product", products),
    group("category", categories),
    group("voucher", vouchers),
  ]);
}

async function searchLive(query: string): Promise<DashboardSearchResponse> {
  const params = { page: 1, per_page: DASHBOARD_SEARCH_LIMIT, search: query };
  const settled = await Promise.allSettled([
    adminApi.listOrders(params),
    adminApi.listUsers(params),
    adminApi.listProducts(params),
    adminApi.listCategories(params),
    adminApi.listVouchers({ page: 1, per_page: DASHBOARD_SEARCH_LIMIT, code: query }),
  ]);

  // Satu endpoint yang gagal tidak boleh mengosongkan seluruh pencarian.
  // Baru anggap pencarian gagal bila semua sumber gagal.
  if (settled.every((result) => result.status === "rejected")) {
    throw new Error("Semua sumber pencarian gagal dimuat");
  }

  const value = <T>(index: number, fallback: T): T =>
    settled[index].status === "fulfilled"
      ? (settled[index] as PromiseFulfilledResult<T>).value
      : fallback;

  const orders = value<Awaited<ReturnType<typeof adminApi.listOrders>>>(0, {
    orders: [], page: 1, per_page: DASHBOARD_SEARCH_LIMIT, total: 0,
  });
  const users = value<Awaited<ReturnType<typeof adminApi.listUsers>>>(1, {
    users: [], page: 1, per_page: DASHBOARD_SEARCH_LIMIT, total: 0,
  });
  const products = value<Awaited<ReturnType<typeof adminApi.listProducts>>>(2, {
    products: [], page: 1, per_page: DASHBOARD_SEARCH_LIMIT, total: 0,
  });
  const categories = value<Awaited<ReturnType<typeof adminApi.listCategories>>>(3, {
    categories: [], page: 1, per_page: DASHBOARD_SEARCH_LIMIT, total: 0,
  });
  const vouchers = value<Awaited<ReturnType<typeof adminApi.listVouchers>>>(4, {
    vouchers: [], page: 1, per_page: DASHBOARD_SEARCH_LIMIT, total: 0,
  });

  return response(query, [
    group("order", (orders.orders ?? []).map(orderResult)),
    group("customer", (users.users ?? []).map(customerResult)),
    group("product", (products.products ?? []).map(productResult)),
    group("category", (categories.categories ?? []).map(categoryResult)),
    group("voucher", (vouchers.vouchers ?? []).map(voucherResult)),
  ]);
}

/**
 * Pencarian global dashboard. Di mode demo memakai data seed; di mode live
 * memakai endpoint admin yang sudah mendukung parameter pencarian di server.
 */
export async function searchDashboard(query: string): Promise<DashboardSearchResponse> {
  const trimmed = query.trim();
  if (trimmed.length < DASHBOARD_SEARCH_MIN_CHARS) {
    return { query: trimmed, groups: [], total: 0 };
  }
  return DEMO_MODE ? searchDemo(trimmed) : searchLive(trimmed);
}
