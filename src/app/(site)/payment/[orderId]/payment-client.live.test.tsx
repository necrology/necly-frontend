import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock } = vi.hoisted(() => ({ getOrderMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  checkoutApi: { getOrder: getOrderMock },
}));

import { PaymentClient } from "./payment-client";

describe("halaman pembayaran (live)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
  });

  it("memanggil checkoutApi.getOrder saat klik lanjutkan ke pembayaran", async () => {
    getOrderMock.mockResolvedValue({
      id: "ord-1",
      number: "NCL-260906-001",
      status: "pending_payment",
      subtotal: 500_000,
      discount: 0,
      total: 512_500,
      currency: "IDR",
      payment_due_at: "2026-09-07T10:00:00Z",
      items: [
        {
          id: "item-1",
          product_price_id: "price-1",
          product_name: "Netflix Premium",
          duration_name: "Monthly",
          unit_price: 186_000,
          quantity: 1,
        },
      ],
    });

    render(<PaymentClient orderId="ord-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Lanjutkan ke pembayaran/i }));

    await waitFor(() => expect(getOrderMock).toHaveBeenCalledWith("ord-1"));
    
    // Wait for success state to appear - check for visible text
    await waitFor(() => expect(screen.getByText("Diarahkan ke pembayaran")).toBeInTheDocument());
  });

  it("menampilkan error saat gagal mengambil pesanan", async () => {
    getOrderMock.mockRejectedValue(new Error("Not found"));
    render(<PaymentClient orderId="ord-404" />);

    fireEvent.click(screen.getByRole("button", { name: /Lanjutkan ke pembayaran/i }));

    await waitFor(() => expect(screen.getByText(/Gagal memuat detail pesanan/i)).toBeInTheDocument());
  });
});