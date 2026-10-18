import { describe, expect, it } from "vitest";
import { getOrderSteps, normalizeOrderStatus, orderStatusLabel, type OrderStatus } from "./order-status";

const backendStatuses: OrderStatus[] = [
  "pending_payment",
  "paid",
  "fulfilling",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
];

describe("getOrderSteps", () => {
  it("menandai tahap selesai dan aktif pada pesanan yang diproses", () => {
    const steps = getOrderSteps("in_progress");

    expect(steps.map(({ label }) => label)).toEqual([
      "Pesanan dibuat",
      "Pembayaran dikonfirmasi",
      "Sedang diproses",
      "Akses diterima",
    ]);
    expect(steps.map(({ state }) => state)).toEqual([
      "complete",
      "complete",
      "current",
      "upcoming",
    ]);
  });

  it("mengakhiri pesanan batal tanpa menyatakan akses diterima", () => {
    const steps = getOrderSteps("cancelled");
    expect(steps.at(-1)).toMatchObject({ label: "Dibatalkan", state: "cancelled" });
    expect(steps.some((step) => step.label === "Akses diterima" && step.state === "complete")).toBe(false);
  });

  it("memetakan seluruh kosakata status backend tanpa fallback diam-diam", () => {
    const expectations: Record<string, { index: number; label: string }> = {
      pending_payment: { index: 0, label: "Menunggu pembayaran" },
      paid: { index: 1, label: "Dibayar" },
      fulfilling: { index: 2, label: "Diproses" },
      processing: { index: 2, label: "Diproses" },
      shipped: { index: 2, label: "Dikirim" },
      delivered: { index: 3, label: "Akses diterima" },
      completed: { index: 4, label: "Selesai" },
      cancelled: { index: -1, label: "Dibatalkan" },
      expired: { index: -1, label: "Kedaluwarsa" },
      refunded: { index: -1, label: "Dikembalikan" },
    };

    for (const status of backendStatuses) {
      expect(orderStatusLabel(status)).toBe(expectations[status].label);
      expect(normalizeOrderStatus(status)).toBe(status);
      const steps = getOrderSteps(status);
      if (expectations[status].index < 0) {
        expect(steps.at(-1)).toMatchObject({ label: expectations[status].label, state: "cancelled" });
      } else {
        expect(steps.filter((step) => step.state === "complete")).toHaveLength(expectations[status].index);
        if (expectations[status].index < 4) {
          expect(steps[expectations[status].index].state).toBe("current");
        }
      }
    }
  });

  it("menolak status yang tidak dikenal tanpa mengarang status lain", () => {
    expect(normalizeOrderStatus("something_else")).toBeNull();
    expect(orderStatusLabel("something_else")).toBe("Status lainnya");
  });
});
