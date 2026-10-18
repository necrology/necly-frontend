import { describe, expect, it } from "vitest";
import { PAYMENT_METHODS, paymentChannelForLabel } from "./payment-channels";

describe("paymentChannelForLabel", () => {
  it("memetakan label tampilan ke enum kanonik, termasuk akhiran _va", () => {
    expect(paymentChannelForLabel("QRIS")).toBe("qris");
    expect(paymentChannelForLabel("BNI")).toBe("bni_va");
    expect(paymentChannelForLabel("BANK BRI")).toBe("bri_va");
    expect(paymentChannelForLabel("mandiri")).toBe("mandiri_va");
  });

  it("tidak melakukan fallback diam-diam untuk label yang tidak dikenal", () => {
    expect(paymentChannelForLabel("metode-lain")).toBeNull();
    expect(new Set(PAYMENT_METHODS.map((method) => method.channel)).size).toBe(PAYMENT_METHODS.length);
  });
});
