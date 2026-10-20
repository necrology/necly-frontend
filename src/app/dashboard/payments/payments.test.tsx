import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPaymentsMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listPaymentsMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: { ...actual.adminApi, listPayments: listPaymentsMock },
  };
});

import PaymentsPage from "./page";

const ORDER = {
  id: "0192f0b0-0000-0000-0000-000000000001",
  number: "ORD-W18-1",
  status: "paid",
  subtotal: 186000,
  discount: 0,
  total: 186000,
  currency: "IDR",
  payment_due_at: "2026-10-18T10:15:00Z",
  created_at: "2026-10-18T10:00:00Z",
  updated_at: "2026-10-18T10:05:00Z",
  customer: { id: "cust-1", name: "Fixture Customer", email: "fixture.customer@example.test" },
  items: [],
  payments: [{
    id: "pay-1",
    order_id: "0192f0b0-0000-0000-0000-000000000001",
    provider: "xendit",
    provider_payment_id: "ps-1",
    status: "paid",
    amount: 186000,
    paid_at: "2026-10-18T10:05:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:05:00Z",
  }],
};

describe("pembayaran admin (W18)", () => {
  beforeEach(() => {
    listPaymentsMock.mockReset();
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    listPaymentsMock.mockResolvedValue({ payments: [ORDER], page: 1, per_page: 50, total: 1 });
  });

  it("memakai endpoint /admin/payments yang sudah ada dan memetakan payment dari pesanan", async () => {
    render(<PaymentsPage />);

    expect(await screen.findByText("pay-1")).toBeInTheDocument();
    expect(screen.getByText("ORD-W18-1")).toBeInTheDocument();
    expect(screen.getByText("Fixture Customer")).toBeInTheDocument();
    expect(screen.getByText("xendit")).toBeInTheDocument();
    expect(screen.getAllByText("Berhasil").length).toBeGreaterThan(0);
    expect(listPaymentsMock).toHaveBeenCalledWith({ page: 1, per_page: 50 });
    expect(screen.queryByText(/belum tersedia/i)).not.toBeInTheDocument();
  });

  it("menampilkan keadaan kosong tanpa error ketika tidak ada pembayaran", async () => {
    listPaymentsMock.mockResolvedValue({ payments: [], page: 1, per_page: 50, total: 0 });
    render(<PaymentsPage />);

    expect(await screen.findByText("Belum ada pembayaran.")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("menolak respons yang tidak sesuai kontrak", async () => {
    listPaymentsMock.mockResolvedValue({ orders: [ORDER], page: 1, per_page: 50, total: 1 });
    render(<PaymentsPage />);

    expect(await screen.findByText(/tidak sesuai kontrak/)).toBeInTheDocument();
  });

  it("tidak meminta data pembayaran untuk peran selain admin", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "seller-1", role: "seller" });
    render(<PaymentsPage />);

    await waitFor(() => expect(screen.getByText(/hanya admin/)).toBeInTheDocument());
    expect(listPaymentsMock).not.toHaveBeenCalled();
  });
});
