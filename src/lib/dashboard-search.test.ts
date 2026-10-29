import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "@/lib/api";
import { searchDashboard } from "./dashboard-search";

const order = {
  id: "order-uuid",
  number: "NCL-260906-091",
  status: "paid",
  subtotal: 109000,
  discount: 0,
  total: 109000,
  currency: "IDR",
  payment_due_at: "2026-09-06T10:20:00Z",
  items: [{ product_name: "StreamFlix Keluarga", duration_name: "3 bulan", unit_price: 109000, quantity: 1, line_total: 109000 }],
  customer: { id: "user-1", name: "Nabila Rahma", email: "nabila@example.id" },
  created_at: "2026-09-06T09:42:00Z",
  updated_at: "2026-09-06T10:04:00Z",
};

const customer = {
  id: "user-1",
  email: "nabila@example.id",
  name: "Nabila Rahma",
  role: "customer" as const,
  active: true,
};

const product = {
  id: "product-1",
  name: "StreamFlix Keluarga",
  slug: "streamflix-keluarga",
  description: "Akses anggota keluarga",
  category: { id: "cat-1", name: "Streaming", slug: "streaming" },
  active: true,
};

const category = {
  id: "cat-1",
  name: "Streaming",
  slug: "streaming",
  description: "Layanan tontonan",
  active: true,
};

const voucher = {
  id: "voucher-1",
  code: "STREAM15",
  type: "percentage",
  value: 15,
  usage_limit: 20,
  active: true,
};

function mockAll() {
  vi.spyOn(adminApi, "listOrders").mockResolvedValue({
    orders: [order], page: 1, per_page: 5, total: 1,
  } as never);
  vi.spyOn(adminApi, "listUsers").mockResolvedValue({
    users: [customer], page: 1, per_page: 5, total: 1,
  } as never);
  vi.spyOn(adminApi, "listProducts").mockResolvedValue({
    products: [product], page: 1, per_page: 5, total: 1,
  } as never);
  vi.spyOn(adminApi, "listCategories").mockResolvedValue({
    categories: [category], page: 1, per_page: 5, total: 1,
  } as never);
  vi.spyOn(adminApi, "listVouchers").mockResolvedValue({
    vouchers: [voucher], page: 1, per_page: 5, total: 1,
  } as never);
}

describe("pencarian global dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("tidak memanggil API untuk kata kunci yang terlalu pendek", async () => {
    const orders = vi.spyOn(adminApi, "listOrders");

    const result = await searchDashboard(" n ");

    expect(result.total).toBe(0);
    expect(orders).not.toHaveBeenCalled();
  });

  it("memetakan hasil dari semua endpoint admin yang mendukung pencarian", async () => {
    mockAll();

    const result = await searchDashboard("nabila");

    expect(result.total).toBe(5);
    expect(result.groups.map((group) => group.kind)).toEqual([
      "order", "customer", "product", "category", "voucher",
    ]);

    const orderResult = result.groups[0].results[0];
    expect(orderResult.title).toBe("NCL-260906-091");
    expect(orderResult.href).toBe("/dashboard/orders/order-uuid");
    expect(orderResult.subtitle).toContain("nabila@example.id");
    expect(orderResult.meta).toContain("StreamFlix Keluarga");

    expect(result.groups[1].results[0]).toMatchObject({
      title: "Nabila Rahma",
      subtitle: "nabila@example.id",
      href: "/dashboard/customers?search=nabila%40example.id",
    });
    expect(result.groups[2].results[0].href).toBe("/dashboard/products?search=StreamFlix%20Keluarga");
    expect(result.groups[3].results[0].href).toBe("/dashboard/categories?search=Streaming");
    expect(result.groups[4].results[0]).toMatchObject({ title: "STREAM15", href: "/dashboard/vouchers?search=STREAM15" });
  });

  it("tetap menampilkan sumber lain saat satu endpoint gagal", async () => {
    mockAll();
    vi.spyOn(adminApi, "listOrders").mockRejectedValue(new Error("down"));

    const result = await searchDashboard("nabila");

    expect(result.groups.map((group) => group.kind)).toEqual([
      "customer", "product", "category", "voucher",
    ]);
    expect(result.total).toBe(4);
  });

  it("melempar error hanya bila semua sumber pencarian gagal", async () => {
    vi.spyOn(adminApi, "listOrders").mockRejectedValue(new Error("down"));
    vi.spyOn(adminApi, "listUsers").mockRejectedValue(new Error("down"));
    vi.spyOn(adminApi, "listProducts").mockRejectedValue(new Error("down"));
    vi.spyOn(adminApi, "listCategories").mockRejectedValue(new Error("down"));
    vi.spyOn(adminApi, "listVouchers").mockRejectedValue(new Error("down"));

    await expect(searchDashboard("nabila")).rejects.toThrow("Semua sumber pencarian gagal dimuat");
  });
});
