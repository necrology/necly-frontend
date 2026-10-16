import { describe, expect, it, vi } from "vitest";
import { continueToCheckout } from "./checkout-navigation";

describe("continueToCheckout", () => {
  it("memakai URL internal dari backend", () => {
    const push = vi.fn();
    continueToCheckout({
      order: { id: "ord-1" },
      payment: { id: "pay-1", order_id: "ord-1", provider: "xendit", status: "pending", amount: 10_000 },
      checkout_url: "/payment/ord-1",
    } as never, push);

    expect(push).toHaveBeenCalledWith("/payment/ord-1");
  });

  it("menolak URL pembayaran non-HTTPS", () => {
    expect(() => continueToCheckout({
      order: { id: "ord-1" },
      payment: { id: "pay-1", order_id: "ord-1", provider: "xendit", status: "pending", amount: 10_000 },
      checkout_url: "http://pay.example/ord-1",
    } as never, vi.fn())).toThrow("HTTPS");
  });
});
