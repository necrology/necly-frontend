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
    window.localStorage.clear();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "usr-1" });
    getOrderMock.mockResolvedValue({
      id: ORDER_ID, number: "NEC-20261021-1", status: "processing",
      subtotal: 186000, discount: 0, total: 186000, currency: "IDR", payment_due_at: "2026-10-21T10:00:00Z",
      items: [{ id: ITEM_ID, product_price_id: "price-1", product_name: "ChatGPT Plus", duration_name: "1 Bulan", unit_price: 186000, quantity: 1, line_total: 186000 }],
      created_at: "2026-10-21T09:00:00Z", updated_at: "2026-10-21T10:00:00Z",
    });
    listAccessMock.mockResolvedValue({
      items: [{
        order_item_id: ITEM_ID,
        product_name: "ChatGPT Plus",
        duration_name: "1 Bulan",
        account_label: "Akun utama",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "valid",
        access_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        code_cooldown_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }],
      otp_inbox_ready: true,
    });
    issueCodeMock.mockResolvedValue({
      code: "ABCD234567", expires_at: "2026-10-21T10:15:00Z", emails: ["family@example.test"], email_sent: true,
    });
  });

  it("menampilkan status kode otomatis dan menautkan email tanpa membocorkan kode", async () => {
    render(<OrderClient orderId={ORDER_ID} />);

    expect(await screen.findByText("Akses akun & OTP")).toBeInTheDocument();
    expect(await screen.findByText(/family@example\.test/)).toBeInTheDocument();
    expect(screen.getByText(/Alur login ChatGPT:/).closest("p")).toHaveTextContent(
      "Alur login ChatGPT: buka ChatGPT → masukkan email akun → klik Lanjut → masukkan password akun. Ambil OTP hanya jika ChatGPT kemudian meminta verifikasi email/OTP.",
    );
    expect(screen.getByText(/Kode akses otomatis dikirim bersama email akun/)).toHaveTextContent(
      /kode akses bukan password akun maupun OTP platform/,
    );
    expect(screen.getByText("Kode akses sudah dikirim lewat email")).toHaveAttribute("role", "status");
    expect(screen.getByText(/Salin kode akses dari email pengiriman/)).toBeInTheDocument();
    expect(screen.queryByText("ABCD234567")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Buat kode akses OTP/i })).not.toBeInTheDocument();
    expect(issueCodeMock).not.toHaveBeenCalled();

    const link = screen.getByRole("link", { name: "Buka halaman Ambil OTP" });
    expect(link).toHaveAttribute("href", "/otp?email=family%40example.test");
    expect(link).not.toHaveAttribute("href", expect.stringContaining("code="));

    const accessHeading = screen.getByRole("heading", { name: "Akses akun & OTP" });
    const progressHeading = screen.getByRole("heading", { name: "Progres Pesanan" });
    const paymentHeading = screen.getByRole("heading", { name: "Detail pembayaran" });
    expect(accessHeading.compareDocumentPosition(progressHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(accessHeading.compareDocumentPosition(paymentHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("tidak memuat atau menampilkan akses untuk pesanan yang belum berhak", async () => {
    getOrderMock.mockResolvedValue({
      ...(await getOrderMock()),
      status: "pending_payment",
    });
    render(<OrderClient orderId={ORDER_ID} />);

    await screen.findByRole("heading", { name: "Detail & Progres Pesanan" });
    expect(listAccessMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Akses akun & OTP" })).not.toBeInTheDocument();
  });

  it("tidak menawarkan kirim ulang saat mailbox OTP belum aktif", async () => {
    listAccessMock.mockResolvedValue({ ...(await listAccessMock()), otp_inbox_ready: false });
    render(<OrderClient orderId={ORDER_ID} />);

    expect(await screen.findByText(/Layanan ambil OTP belum aktif/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kirim ulang kode akses/ })).not.toBeInTheDocument();
  });

  it("menonaktifkan pembuatan kode saat akun belum punya sumber mailbox", async () => {
    listAccessMock.mockResolvedValue({
      items: [{ order_item_id: ITEM_ID, product_name: "ChatGPT Plus", duration_name: "1 Bulan", account_label: "Akun utama", account_email: "family@example.test", otp_ready: false }],
      otp_inbox_ready: true,
    });
    render(<OrderClient orderId={ORDER_ID} />);

    expect(await screen.findByText(/Layanan OTP untuk akun ini belum disiapkan/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kirim ulang kode akses/ })).not.toBeInTheDocument();
  });

  it("tidak menampilkan kode atau CTA resend ketika metadata valid ternyata sudah lewat waktu", async () => {
    listAccessMock.mockResolvedValue({
      items: [{
        order_item_id: ITEM_ID,
        product_name: "ChatGPT Plus",
        duration_name: "1 Bulan",
        account_label: "Akun utama",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "valid",
        access_code_expires_at: "2020-01-01T00:00:00Z",
        code_cooldown_until: "2020-01-01T00:00:00Z",
      }],
      otp_inbox_ready: true,
    });

    render(<OrderClient orderId={ORDER_ID} />);

    expect(await screen.findByText(/Kode akses dari email pengiriman sudah kedaluwarsa/)).toBeInTheDocument();
    expect(screen.queryByText("Kode akses sudah dikirim lewat email")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirim ulang kode akses" })).toBeEnabled();
  });

  it("menawarkan kirim ulang hanya setelah kode otomatis kedaluwarsa", async () => {
    listAccessMock.mockResolvedValue({
      items: [{
        order_item_id: ITEM_ID,
        product_name: "ChatGPT Plus",
        duration_name: "1 Bulan",
        account_label: "Akun utama",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "expired",
      }],
      otp_inbox_ready: true,
    });
    issueCodeMock.mockResolvedValue({
      code: "ABCD234567",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      emails: ["family@example.test"],
      email_sent: true,
    });

    render(<OrderClient orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Kirim ulang kode akses" }));

    await waitFor(() => expect(issueCodeMock).toHaveBeenCalledWith(ORDER_ID, ITEM_ID));
    expect(await screen.findByText("ABCD234567")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka halaman Ambil OTP" })).toHaveAttribute(
      "href",
      "/otp?email=family%40example.test&code=ABCD234567",
    );
  });
});
