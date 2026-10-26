import { describe, expect, it } from "vitest";
import {
  mapApiAuditLog,
  mapApiDashboard,
  mapApiInventoryAccountToManaged,
  mapApiInventorySlotAssignment,
  mapApiOrderToDashboardOrder,
  mapApiUserToCustomer,
  mapApiProductToSubscriptionProduct,
} from "./admin-mappers";
import { ORDER_STATUS_OPTIONS, orderStatusLabel } from "./order-status";
import type { ApiInventoryAccount, ApiInventorySlot, ApiOrder, ApiUser } from "./api";

const D0 = {
  total_users: 2,
  total_orders: 1,
  total_revenue: 0,
  pending_orders: 1,
  active_users: 2,
  new_users_today: 2,
  orders_today: 1,
  revenue_today: 0,
  active_activations: 0,
  available_slots: 1,
};

const D1 = {
  ...D0,
  total_revenue: 167400,
  pending_orders: 0,
  revenue_today: 167400,
  active_activations: 1,
};

function order(overrides: Partial<ApiOrder> = {}): ApiOrder {
  return {
    id: "0192f0b0-0000-0000-0000-000000000001",
    number: "ORD-1760832000000-0192f0b0",
    user_id: "0192f0c0-0000-0000-0000-000000000001",
    status: "pending_payment",
    subtotal: 186000,
    discount: 18600,
    total: 167400,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:00:00Z",
    customer: { id: "0192f0c0-0000-0000-0000-000000000001", name: "Fixture Customer", email: "fixture.customer@example.test" },
    items: [{
      id: "0192f0b2-0000-0000-0000-000000000001",
      order_id: "0192f0b0-0000-0000-0000-000000000001",
      product_price_id: "0192f0a4-0000-0000-0000-000000000001",
      product_name: "Netflix Premium",
      duration_name: "1 Bulan",
      unit_price: 186000,
      quantity: 1,
      device_count: 1,
      line_total: 186000,
    }],
    ...overrides,
  };
}

describe("kontrak W0 C-06 dashboard", () => {
  it("memetakan D0 apa adanya, termasuk nol yang sah", () => {
    expect(mapApiDashboard(D0)).toEqual({
      grossRevenue: 0,
      newOrders: 1,
      activeActivations: 0,
      availableSlots: 1,
    });
  });

  it("memetakan D1 setelah pembayaran lunas", () => {
    expect(mapApiDashboard(D1)).toEqual({
      grossRevenue: 167400,
      newOrders: 1,
      activeActivations: 1,
      availableSlots: 1,
    });
  });

  it("menolak metrik yang tidak ada alih-alih menampilkan nol palsu", () => {
    const withoutRevenue = { ...D1 } as Record<string, unknown>;
    delete withoutRevenue.total_revenue;
    expect(() => mapApiDashboard(withoutRevenue)).toThrow(/total_revenue/);
  });

  it("menolak nilai metrik yang bukan angka", () => {
    expect(() => mapApiDashboard({ ...D1, available_slots: null })).toThrow(/available_slots/);
  });

  it("menolak DTO C-06 yang kehilangan field yang tidak tampil di UI", () => {
    const withoutUsers = { ...D1 } as Record<string, unknown>;
    delete withoutUsers.total_users;
    expect(() => mapApiDashboard(withoutUsers)).toThrow(/total_users/);
  });
});

describe("kontrak W0 C-07 audit log", () => {
  const fixture = {
    id: "0192f0d0-0000-0000-0000-000000000001",
    actor_user_id: "0192f0c0-0000-0000-0000-000000000001",
    actor_user: { id: "0192f0c0-0000-0000-0000-000000000001", name: "Fixture Customer", email: "fixture.customer@example.test", role: "customer" },
    action: "auth.login.succeeded",
    resource_type: "user",
    resource_id: "0192f0c0-0000-0000-0000-000000000001",
    ip_address: "203.0.113.10",
    metadata: null,
    created_at: "2026-10-18T09:00:00Z",
  };

  it("memetakan aktor, aksi, resource, IP, dan waktu persis dari DTO", () => {
    expect(mapApiAuditLog(fixture)).toEqual({
      id: fixture.id,
      actor: "Fixture Customer",
      action: "auth.login.succeeded",
      resource: "user · 0192f0c0-0000-0000-0000-000000000001",
      ip: "203.0.113.10",
      time: "2026-10-18T09:00:00Z",
    });
  });

  it("menampilkan aktor anonim dan resource tanpa id sebagai —/tipe", () => {
    expect(mapApiAuditLog({ ...fixture, actor_user: null, resource_id: null, ip_address: "" })).toMatchObject({
      actor: "—",
      resource: "user",
      ip: "",
    });
  });

  it("menolak DTO audit yang kehilangan field wajib", () => {
    const missingAction = { ...fixture } as Record<string, unknown>;
    delete missingAction.action;
    expect(() => mapApiAuditLog(missingAction)).toThrow(/tidak lengkap/);
  });

  it("menolak DTO audit tanpa ip_address meskipun string kosong tetap sah", () => {
    const missingIp = { ...fixture } as Record<string, unknown>;
    delete missingIp.ip_address;
    expect(() => mapApiAuditLog(missingIp)).toThrow(/tidak lengkap/);
    expect(mapApiAuditLog({ ...fixture, ip_address: "" }).ip).toBe("");
  });
});

describe("kontrak C-02 pesanan untuk daftar admin", () => {
  it("menyimpan nomor untuk display dan UUID untuk route detail", () => {
    const mapped = mapApiOrderToDashboardOrder(order());
    expect(mapped).toMatchObject({
      id: "ORD-1760832000000-0192f0b0",
      apiId: "0192f0b0-0000-0000-0000-000000000001",
      customer: "Fixture Customer",
      customerEmail: "fixture.customer@example.test",
      service: "Netflix Premium",
      duration: "1 Bulan",
      amount: 167400,
      status: "Menunggu pembayaran",
    });
  });

  it("menyediakan label untuk seluruh 10 status backend pada satu sumber", () => {
    const backendStatuses = ["pending_payment", "paid", "fulfilling", "processing", "shipped", "delivered", "completed", "cancelled", "expired", "refunded"] as const;
    const labels = backendStatuses.map(orderStatusLabel);
    for (const label of labels) {
      expect(ORDER_STATUS_OPTIONS).toContain(label);
    }
    expect(new Set(ORDER_STATUS_OPTIONS).size).toBe(ORDER_STATUS_OPTIONS.length);
    expect(orderStatusLabel("delivered")).toBe("Akses diterima");
  });

  it.each([
    ["paid", "Dibayar"],
    ["fulfilling", "Diproses"],
    ["processing", "Diproses"],
    ["shipped", "Dikirim"],
    ["delivered", "Akses diterima"],
    ["completed", "Selesai"],
    ["cancelled", "Dibatalkan"],
    ["expired", "Kedaluwarsa"],
    ["refunded", "Dikembalikan"],
    ["awaiting_manual_review", "Status lainnya"],
  ])("memetakan status backend %s menjadi %s", (status, label) => {
    expect(mapApiOrderToDashboardOrder(order({ status })).status).toBe(label);
  });

  it("tidak mengganti pelanggan atau item yang tidak dikirim dengan data contoh", () => {
    const mapped = mapApiOrderToDashboardOrder(order({ customer: null, items: [] }));
    expect(mapped.customer).toBe("—");
    expect(mapped.customerEmail).toBe("—");
    expect(mapped.service).toBe("—");
    expect(mapped.duration).toBe("—");
  });
});

function apiUser(overrides: Partial<ApiUser> = {}): ApiUser {
  return {
    id: "0192f0c0-0000-0000-0000-000000000002",
    name: "Budi Santoso",
    email: "budi@example.test",
    role: "customer",
    active: true,
    email_verified_at: "2026-01-03T00:00:00Z",
    created_at: "2026-01-03T00:00:00Z",
    ...overrides,
  };
}

// Perbaikan utama PR #6: `active:false` tidak boleh lagi tampil "Aktif" di
// dashboard admin. Blok ini mengunci matriks status agar tidak regresi.
describe("kontrak status akses pengguna (perbaikan PR #6)", () => {
  it("menandai akun nonaktif sebagai Nonaktif meski email terverifikasi", () => {
    expect(mapApiUserToCustomer(apiUser({ active: false, email_verified_at: "2026-01-03T00:00:00Z" })).status).toBe("Nonaktif");
  });

  it("menandai akun nonaktif tanpa verifikasi tetap sebagai Nonaktif", () => {
    expect(mapApiUserToCustomer(apiUser({ active: false, email_verified_at: null })).status).toBe("Nonaktif");
  });

  it("menandai akun aktif dan terverifikasi sebagai Aktif", () => {
    expect(mapApiUserToCustomer(apiUser({ active: true, email_verified_at: "2026-01-03T00:00:00Z" })).status).toBe("Aktif");
  });

  it("menandai akun aktif yang belum terverifikasi sebagai Baru", () => {
    expect(mapApiUserToCustomer(apiUser({ active: true, email_verified_at: null })).status).toBe("Baru");
  });

  it("memakai Aktif/Baru saat sesi lama tidak mengirim field active", () => {
    expect(mapApiUserToCustomer(apiUser({ active: undefined, email_verified_at: "2026-01-03T00:00:00Z" })).status).toBe("Aktif");
    expect(mapApiUserToCustomer(apiUser({ active: undefined, email_verified_at: null })).status).toBe("Baru");
  });

  it("memetakan role mentah ke label bahasa Indonesia", () => {
    expect(mapApiUserToCustomer(apiUser({ role: "customer" })).role).toBe("Pelanggan");
    expect(mapApiUserToCustomer(apiUser({ role: "seller" })).role).toBe("Penjual");
    expect(mapApiUserToCustomer(apiUser({ role: "admin" })).role).toBe("Admin");
  });

  it("menyusun inisial dari nama dan menandai status verifikasi", () => {
    const mapped = mapApiUserToCustomer(apiUser({ name: "Budi Santoso", email_verified_at: "2026-01-03T00:00:00Z" }));
    expect(mapped.initials).toBe("BS");
    expect(mapped.verified).toBe(true);
    expect(mapApiUserToCustomer(apiUser({ email_verified_at: null })).verified).toBe(false);
  });
});


describe("kontrak Coming Soon dan foto produk admin (NEC-89)", () => {
  it("memetakan active, coming_soon, dan image_url untuk tabel dashboard", () => {
    const product = mapApiProductToSubscriptionProduct({
      id: "prd-coming",
      name: "Canva Pro",
      slug: "canva-pro",
      description: "Desain kolaboratif",
      category: { id: "cat-kreatif", name: "Kreatif", slug: "kreatif" },
      active: true,
      coming_soon: true,
      image_url: "https://cdn.necly.id/canva.jpg",
      icon_url: "/design-assets/logo-canva.svg",
      prices: [{ id: "price-1", amount: 50_000, active: true, duration: { name: "1 Bulan", days: 30 }, available_slots: 2 }],
    });

    expect(product).toMatchObject({
      comingSoon: true,
      active: true,
      imageUrl: "https://cdn.necly.id/canva.jpg",
      iconUrl: "/design-assets/logo-canva.svg",
      stock: 2,
    });
  });
});

describe("kontrak Manajemen akun Fase 2 NEC-96", () => {
  const now = new Date("2026-10-22T00:00:00Z");

  it("memakai field turunan backend untuk masa aktif, sharing, pengguna, dan OTP", () => {
    const account: ApiInventoryAccount = {
      id: "acc-1",
      product_id: "prd-1",
      product: { id: "prd-1", name: "Netflix Premium", slug: "netflix-premium", description: "Streaming" },
      label: "Akun utama",
      status: "active",
      expires_at: "2026-11-01T00:00:00Z",
      days_remaining: 10,
      sharing_limit: 5,
      total_slots: 4,
      available_slots: 2,
      used_slots: 2,
      remaining_slots: 1,
      assigned_users: 2,
      otp_configured: true,
      needs_review: false,
      sellable: true,
    };

    expect(mapApiInventoryAccountToManaged(account, undefined, now)).toMatchObject({
      productName: "Netflix Premium",
      daysRemaining: 10,
      sharingLimit: 5,
      usedSlots: 2,
      remainingSlots: 1,
      assignedUsers: 2,
      otpConfigured: true,
      needsReview: false,
      sellable: true,
    });
  });

  it("menandai akun lama di atas lima pengguna dan menghitung sisa hari bila field turunan absen", () => {
    const account: ApiInventoryAccount = {
      id: "acc-legacy",
      product_id: "prd-1",
      label: "Akun lama",
      status: "active",
      expires_at: "2026-10-25T00:00:00Z",
      sharing_limit: 6,
      total_slots: 6,
      available_slots: 0,
      used_slots: 6,
      remaining_slots: 0,
    };

    const mapped = mapApiInventoryAccountToManaged(account, "Produk cadangan", now);
    expect(mapped.productName).toBe("Produk cadangan");
    expect(mapped.daysRemaining).toBe(3);
    expect(mapped.needsReview).toBe(true);
    expect(mapped.otpConfigured).toBe(false);
    expect(mapped.assignedUsers).toBe(6);
  });

  it("memetakan assignment slot dengan masa akses pembeli tanpa kredensial", () => {
    const slot: ApiInventorySlot = {
      id: "slot-1",
      inventory_account_id: "acc-1",
      product_price_id: "price-1",
      status: "used",
      order_id: "order-1",
      order_number: "ORD-001",
      payment_status: "paid",
      reserved_name: "Budi Pelanggan",
      reserved_email: "budi@example.test",
      activated_at: "2026-10-01T00:00:00Z",
      access_expires_at: "2026-10-31T00:00:00Z",
      days_remaining: 9,
    };

    expect(mapApiInventorySlotAssignment(slot, now)).toMatchObject({
      name: "Budi Pelanggan",
      email: "budi@example.test",
      orderNumber: "ORD-001",
      paymentStatus: "paid",
      accessExpiresAt: "2026-10-31T00:00:00Z",
      daysRemaining: 9,
    });
    expect(mapApiInventorySlotAssignment(slot, now)).not.toHaveProperty("credentials");
  });
});
