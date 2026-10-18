import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock, bootstrapAuthMock } = vi.hoisted(() => ({
  getOrderMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    checkoutApi: { ...actual.checkoutApi, getOrder: getOrderMock },
    bootstrapAuth: bootstrapAuthMock,
  };
});

import { ApiError } from "@/lib/api";
import { OrderClient } from "./order-client";

const ORDER_ID = "0192f0b0-0000-0000-0000-000000000001";

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    number: "ORD-1760832000000-0192f0b0",
    status: "pending_payment",
    subtotal: 186_000,
    discount: 18_600,
    total: 167_400,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:00:00Z",
    items: [
      {
        id: "0192f0b2-0000-0000-0000-000000000001",
        product_price_id: "0192f0a4-0000-0000-0000-000000000001",
        product_name: "Netflix Premium",
        duration_name: "1 Bulan",
        unit_price: 186_000,
        quantity: 1,
        device_count: 1,
        line_total: 186_000,
      },
    ],
    payments: [
      {
        id: "0192f0b1-0000-0000-0000-000000000001",
        provider: "mock",
        status: "pending",
        amount: 167_400,
      },
    ],
    ...overrides,
  };
}

describe("halaman pelacakan pesanan (live)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "usr-1" });
    getOrderMock.mockResolvedValue(order());
  });

  it("memulihkan sesi lalu memanggil checkoutApi.getOrder", async () => {
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(getOrderMock).toHaveBeenCalledWith(ORDER_ID));
    expect(bootstrapAuthMock).toHaveBeenCalled();
    expect(screen.getByText("Pesanan ORD-1760832000000-0192f0b0")).toBeInTheDocument();
  });

  it("menampilkan status dan item dari API", async () => {
    getOrderMock.mockResolvedValue(order({ status: "paid" }));
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText("Dibayar")).toBeInTheDocument());
    expect(screen.getAllByText("Netflix Premium")).toHaveLength(1);
    expect(screen.getByText(/1 Bulan × 1/)).toBeInTheDocument();
  });

  it("memetakan status terminal refunded tanpa data contoh", async () => {
    getOrderMock.mockResolvedValue(order({ status: "refunded" }));
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getAllByText("Dikembalikan").length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText("Dikembalikan", { selector: ".order-step strong" })).toBeInTheDocument();
  });

  it("menampilkan tidak ditemukan tanpa mengarang pesanan saat API 404", async () => {
    getOrderMock.mockRejectedValue(new ApiError("Pesanan tidak ditemukan", 404, { code: "not_found" }));
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText("Pesanan tidak ditemukan")).toBeInTheDocument());
    expect(screen.queryByText("Netflix Premium")).not.toBeInTheDocument();
    expect(screen.queryByText(/ORD-1760832000000/)).not.toBeInTheDocument();
  });

  it("menolak id yang bukan UUID tanpa memanggil API", async () => {
    render(<OrderClient orderId="ord-404" />);

    await waitFor(() => expect(screen.getByText("Pesanan tidak ditemukan")).toBeInTheDocument());
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("meminta pembeli masuk ketika sesi tidak dapat dipulihkan", async () => {
    bootstrapAuthMock.mockResolvedValue(null);
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText("Masuk untuk melihat pesanan")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", `/login?redirect=/orders/${ORDER_ID}`);
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("menampilkan error umum saat gagal mengambil pesanan", async () => {
    getOrderMock.mockRejectedValue(new Error("Network error"));
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText(/Gagal memuat detail pesanan/)).toBeInTheDocument());
    expect(screen.queryByText("Netflix Premium")).not.toBeInTheDocument();
  });
});
