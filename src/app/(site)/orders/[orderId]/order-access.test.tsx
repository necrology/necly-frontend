import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock, listAccessMock, issueCodeMock, bootstrapAuthMock } = vi.hoisted(() => ({
  getOrderMock: vi.fn(),
  listAccessMock: vi.fn(),
  issueCodeMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    checkoutApi: { ...actual.checkoutApi, getOrder: getOrderMock },
    accountOtpApi: { ...actual.accountOtpApi, listAccess: listAccessMock, issueCode: issueCodeMock },
    bootstrapAuth: bootstrapAuthMock,
  };
});

import { OrderClient } from "./order-client";

const ORDER_ID = "0192f0b0-0000-0000-0000-000000000001";
const ITEM_ID = "0192f0b2-0000-0000-0000-000000000001";

describe("akses akun dan OTP pada detail pesanan", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
    listAccessMock.mockReset();
    issueCodeMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "usr-1" });
    getOrderMock.mockResolvedValue({
      id: ORDER_ID, number: "NEC-20261021-1", status: "processing",
      subtotal: 186000, discount: 0, total: 186000, currency: "IDR", payment_due_at: "2026-10-21T10:00:00Z",
      items: [{ id: ITEM_ID, product_price_id: "price-1", product_name: "Netflix Premium", duration_name: "1 Bulan", unit_price: 186000, quantity: 1, line_total: 186000 }],
      created_at: "2026-10-21T09:00:00Z", updated_at: "2026-10-21T10:00:00Z",
    });
    listAccessMock.mockResolvedValue({
      items: [{ order_item_id: ITEM_ID, product_name: "Netflix Premium", duration_name: "1 Bulan", account_label: "Akun utama", account_email: "family@example.test" }],
      otp_inbox_ready: true,
    });
    issueCodeMock.mockResolvedValue({
      code: "ABCD234567", expires_at: "2026-10-21T10:15:00Z", emails: ["family@example.test"], email_sent: true,
    });
  });

  it("menampilkan email akun dan menautkan kode akses ke halaman OTP", async () => {
    render(<OrderClient orderId={ORDER_ID} />);

    expect(await screen.findByText("Akses akun & OTP")).toBeInTheDocument();
    expect(await screen.findByText(/family@example\.test/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buat kode akses OTP" }));

    await waitFor(() => expect(issueCodeMock).toHaveBeenCalledWith(ORDER_ID, ITEM_ID));
    expect(await screen.findByText("ABCD234567")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Ambil OTP" });
    expect(link).toHaveAttribute("href", "/otp?email=family%40example.test&code=ABCD234567");
  });

  it("menonaktifkan pembuatan kode saat mailbox OTP belum aktif", async () => {
    listAccessMock.mockResolvedValue({ ...(await listAccessMock()), otp_inbox_ready: false });
    render(<OrderClient orderId={ORDER_ID} />);

    const button = await screen.findByRole("button", { name: "Buat kode akses OTP" });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Layanan ambil OTP belum aktif/)).toBeInTheDocument();
  });
});
