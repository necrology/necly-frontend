import { describe, expect, it } from "vitest";
import type { ApiDeliveryAccountOption, ApiOrder, ApiOrderDelivery } from "./api";
import {
  accessIsExpired,
  accountDisabledReason,
  deliveryErrorGuidanceFor,
  deliveryNeedsReplacement,
  summarizeDeliveries,
  summarizeOrderPayment,
} from "./order-delivery";

function account(overrides: Partial<ApiDeliveryAccountOption> = {}): ApiDeliveryAccountOption {
  return {
    inventory_account_id: "acc-1",
    label: "Akun 1",
    status: "active",
    days_remaining: 20,
    sharing_limit: 5,
    assigned_users: 1,
    used_slots: 1,
    remaining_slots: 4,
    used_by_customer: false,
    assigned_to_item: false,
    can_assign: true,
    ...overrides,
  };
}

function delivery(overrides: Partial<ApiOrderDelivery> = {}): ApiOrderDelivery {
  return {
    id: "delivery-1",
    order_id: "order-1",
    order_item_id: "item-1",
    status: "sent",
    attempts: 1,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("panduan error delivery", () => {
  it.each([
    ["account_full", "Akun penuh"],
    ["account_unavailable", "Akun tidak tersedia"],
    ["no_alternative_account", "Tidak ada akun alternatif"],
    ["account_not_expired", "Masa akses lama masih aktif"],
  ])("menampilkan kode %s apa adanya dengan tindakan", (code, label) => {
    const guidance = deliveryErrorGuidanceFor(code);
    expect(guidance?.label).toBe(label);
    expect(guidance?.action.length).toBeGreaterThan(10);
  });

  it("mengembalikan kode mentah bila belum dipetakan", () => {
    expect(deliveryErrorGuidanceFor("future_code")).toEqual({
      label: "future_code",
      action: "Periksa status pesanan lalu coba lagi.",
    });
  });
});

describe("pemilihan akun", () => {
  it("menonaktifkan akun yang sudah dipakai user walau backend keliru mengizinkan", () => {
    expect(accountDisabledReason(account({ used_by_customer: true, can_assign: true }), 1)).toBe(
      "Sudah dipakai user ini",
    );
  });

  it("menjelaskan akun penuh dan jumlah item di atas kapasitas", () => {
    expect(accountDisabledReason(account({ can_assign: false, remaining_slots: 0 }), 1)).toBe("Kapasitas penuh");
    expect(accountDisabledReason(account({ can_assign: false, remaining_slots: 3 }), 6)).toContain(
      "melebihi kapasitas 5 user",
    );
  });

  it("mengizinkan akun eligible", () => {
    expect(accountDisabledReason(account(), 1)).toBeNull();
  });
});

describe("status pengiriman dan penggantian", () => {
  it("hanya menawarkan ganti akun untuk delivery terkirim yang expired atau bermasalah", () => {
    const now = new Date("2026-10-22T00:00:00Z");
    expect(accessIsExpired([{ inventory_account_id: "a", label: "A", status: "active", days_remaining: 0 }], now)).toBe(true);
    expect(deliveryNeedsReplacement(delivery({ assigned_accounts: [{ inventory_account_id: "a", label: "A", status: "active", days_remaining: 0 }] }), now)).toBe(true);
    expect(deliveryNeedsReplacement(delivery({ assigned_accounts: [{ inventory_account_id: "a", label: "A", status: "active", days_remaining: 10 }] }), now)).toBe(false);
    expect(deliveryNeedsReplacement(delivery({ error_code: "complaint", assigned_accounts: [{ inventory_account_id: "a", label: "A", status: "active", days_remaining: 10 }] }), now)).toBe(true);
    expect(deliveryNeedsReplacement(delivery({ status: "failed", error_code: "email_failed" }), now)).toBe(false);
  });

  it("meringkas status delivery tanpa mengarang status terkirim", () => {
    expect(summarizeDeliveries([]).label).toBe("Belum ada pengiriman");
    expect(summarizeDeliveries([delivery({ status: "pending" })]).label).toBe("Menunggu pengiriman");
    expect(summarizeDeliveries([delivery({ status: "sent" }), delivery({ id: "d2", status: "failed" })]).label).toBe(
      "Ada pengiriman gagal",
    );
  });
});

describe("ringkasan pembayaran", () => {
  const baseOrder = {
    id: "order-1",
    number: "ORD-1",
    status: "paid",
    subtotal: 100,
    discount: 0,
    total: 100,
    currency: "IDR",
    payment_due_at: "2026-10-01T00:00:00Z",
    items: [],
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  } satisfies ApiOrder;

  it("memakai payment_status terbaru dan metode dari payment", () => {
    const summary = summarizeOrderPayment({
      ...baseOrder,
      payment_status: "paid",
      payments: [{ id: "p", provider: "xendit", status: "pending", amount: 100, paid_at: "2026-10-01T10:00:00Z" }],
    });
    expect(summary.paid).toBe(true);
    expect(summary.label).toBe("Sudah dibayar");
    expect(summary.method).toBe("Xendit");
    expect(summary.paidAt).toBe("2026-10-01T10:00:00Z");
  });

  it("menampilkan belum dibayar saat pembayaran masih pending", () => {
    const summary = summarizeOrderPayment({
      ...baseOrder,
      payment_status: "pending",
      payments: [{ id: "p", provider: "xendit", status: "pending", amount: 100 }],
    });
    expect(summary.paid).toBe(false);
    expect(summary.label).toBe("Belum dibayar");
  });

  it("menampilkan belum ada pembayaran tanpa data pembayaran", () => {
    expect(summarizeOrderPayment(baseOrder).label).toBe("Belum ada pembayaran");
  });
});
