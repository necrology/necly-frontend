import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock, bootstrapAuthMock, listOrdersMock } = vi.hoisted(() => ({
  getOrderMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
  listOrdersMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: { ...actual.adminApi, getOrder: getOrderMock, listOrders: listOrdersMock },
  };
});

import { ApiError } from "@/lib/api";
import { AdminOrderDetail } from "./admin-order-detail";

const ORDER_ID = "0192f0b0-0000-0000-0000-000000000001";

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    number: "ORD-1760832000000-0192f0b0",
    user_id: "0192f0c0-0000-0000-0000-000000000001",
    status: "paid",
    subtotal: 186000,
    discount: 18600,
    total: 167400,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:05:00Z",
    customer: { id: "cust-1", name: "Fixture Customer", email: "fixture.customer@example.test" },
    items: [{
      id: "item-1",
      product_price_id: "price-1",
      product_name: "Netflix Premium",
      duration_name: "1 Bulan",
      unit_price: 186000,
      quantity: 1,
      device_count: 1,
      line_total: 186000,
    }],
    payments: [{
      id: "pay-1",
      order_id: ORDER_ID,
      provider: "xendit",
      provider_payment_id: "ps-fixture-1",
      status: "paid",
      amount: 167400,
      paid_at: "2026-10-18T10:05:00Z",
      created_at: "2026-10-18T10:00:00Z",
      updated_at: "2026-10-18T10:05:00Z",
    }],
    ...overrides,
  };
}

describe("detail pesanan admin (C19)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
    listOrdersMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    getOrderMock.mockResolvedValue(order());
  });

  it("menampilkan data pesanan dan pembayaran nyata dari API", async () => {
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Pesanan ORD-1760832000000-0192f0b0")).toBeInTheDocument();
    expect(screen.getAllByText("Rp167.400").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Netflix Premium")).toBeInTheDocument();
    expect(screen.getByText("xendit")).toBeInTheDocument();
    expect(screen.getByText("ps-fixture-1")).toBeInTheDocument();
    expect(screen.getByText("Fixture Customer")).toBeInTheDocument();
    expect(getOrderMock).toHaveBeenCalledWith(ORDER_ID);
  });

  it("menampilkan 404 sebagai pesanan tidak ditemukan tanpa data karangan", async () => {
    getOrderMock.mockRejectedValue(new ApiError("Pesanan tidak ditemukan", 404, { code: "not_found" }));
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Pesanan tidak ditemukan")).toBeInTheDocument();
    expect(screen.queryByText("Netflix Premium")).not.toBeInTheDocument();
  });

  it("menolak id bukan UUID tanpa memanggil API", async () => {
    render(<AdminOrderDetail orderId="not-a-uuid" />);

    expect(await screen.findByText("Pesanan tidak ditemukan")).toBeInTheDocument();
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("tidak meminta detail pesanan untuk penjual", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "seller-1", role: "seller" });
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("menampilkan error yang jelas saat API gagal", async () => {
    getOrderMock.mockRejectedValue(new Error("network"));
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText(/Gagal memuat detail pesanan/)).toBeInTheDocument());
  });
});
