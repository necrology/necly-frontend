import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock } = vi.hoisted(() => ({ getOrderMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  checkoutApi: { getOrder: getOrderMock },
}));

import { OrderClient } from "./order-client";

describe("halaman pelacakan pesanan (live)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
    getOrderMock.mockResolvedValue({
      id: "ord-1",
      number: "NCL-260906-001",
      status: "confirmed",
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
  });

  it("memanggil checkoutApi.getOrder saat DEMO_MODE=false", async () => {
    render(<OrderClient orderId="ord-1" />);

    await waitFor(() => expect(getOrderMock).toHaveBeenCalledWith("ord-1"));
    expect(screen.getByText("NCL-260906-001")).toBeInTheDocument();
  });

  it("menampilkan status pesanan dan item dari API", async () => {
    render(<OrderClient orderId="ord-1" />);

    await waitFor(() => expect(screen.getByText("Dibayar")).toBeInTheDocument());
    expect(screen.getAllByText("Netflix Premium")).toHaveLength(2);
  });

  it("menampilkan error saat gagal mengambil pesanan", async () => {
    getOrderMock.mockRejectedValue(new Error("Not found"));
    render(<OrderClient orderId="ord-404" />);

    await waitFor(() => expect(screen.getByText(/Gagal memuat detail pesanan/i)).toBeInTheDocument());
  });
});