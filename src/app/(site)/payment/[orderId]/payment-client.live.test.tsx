import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock } = vi.hoisted(() => ({ getOrderMock: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    checkoutApi: { ...actual.checkoutApi, getOrder: getOrderMock },
    bootstrapAuth: vi.fn().mockResolvedValue({ id: "usr-1" }),
  };
});

import { PaymentClient } from "./payment-client";

describe("halaman pembayaran (live)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
  });

  it("memuat status pesanan otomatis setelah kembali dari Xendit", async () => {
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

    await waitFor(() => expect(getOrderMock).toHaveBeenCalledWith("ord-1"));
    await waitFor(() => expect(screen.getByText("Menunggu pembayaran")).toBeInTheDocument());
  });

  it("menampilkan tautan Pesanan saya setelah pembayaran dikonfirmasi", async () => {
    getOrderMock.mockResolvedValue({
      id: "ord-1",
      number: "NCL-260906-001",
      status: "paid",
      subtotal: 500_000,
      discount: 0,
      total: 512_500,
      currency: "IDR",
      payment_due_at: "2026-09-07T10:00:00Z",
      items: [],
    });

    render(<PaymentClient orderId="ord-1" />);

    await waitFor(() => expect(screen.getByText("Pembayaran berhasil")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Pesanan saya" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: "Lihat pesanan" })).toHaveAttribute("href", "/orders/ord-1");
  });

  it("menampilkan error saat gagal mengambil pesanan", async () => {
    getOrderMock.mockRejectedValue(new Error("Not found"));
    render(<PaymentClient orderId="ord-404" />);

    await waitFor(() => expect(screen.getByText(/Gagal memuat status pembayaran/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Coba lagi/i }));
    await waitFor(() => expect(getOrderMock).toHaveBeenCalledTimes(2));
  });
});
