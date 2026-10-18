import { describe, expect, it } from "vitest";
import { mapApiAuditLog, mapApiDashboard, mapApiOrderToDashboardOrder } from "./admin-mappers";
import type { ApiOrder } from "./api";

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
