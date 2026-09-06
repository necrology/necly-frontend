import { describe, expect, it } from "vitest";
import { getOrderSteps } from "./order-status";

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
});
