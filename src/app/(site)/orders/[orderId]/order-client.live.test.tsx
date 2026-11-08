import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock, bootstrapAuthMock, listAccessMock, issueCodeMock } = vi.hoisted(() => ({
  getOrderMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
  listAccessMock: vi.fn(),
  issueCodeMock: vi.fn(),
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

import { ApiError } from "@/lib/api";
import { OrderClient } from "./order-client";

const ORDER_ID = "0192f0b0-0000-0000-0000-000000000001";
const ACCESS_COOLDOWN_COPY = "Kode akses berlaku 5 menit. Gunakan kode dari email pengiriman sebelum meminta kirim ulang.";

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
    listAccessMock.mockReset().mockResolvedValue({ items: [], otp_inbox_ready: true });
    issueCodeMock.mockReset();
    window.localStorage.clear();
  });

  it("memulihkan sesi lalu memanggil checkoutApi.getOrder", async () => {
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(getOrderMock).toHaveBeenCalledWith(ORDER_ID));
    expect(bootstrapAuthMock).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Detail & Progres Pesanan" })).toBeInTheDocument();
    expect(screen.queryByText("Pelacakan pesanan")).not.toBeInTheDocument();
    expect(screen.getByText("Nomor Pesanan:")).toBeInTheDocument();
    expect(screen.getAllByText("ORD-1760832000000-0192f0b0").length).toBeGreaterThanOrEqual(1);
    // Pesanan yang belum dibayar belum berhak mendapat kartu akses/OTP.
    expect(screen.queryByRole("heading", { name: "Akses akun & OTP" })).not.toBeInTheDocument();
  });

  it("menyalin nomor pesanan dari header dan menampilkan umpan balik sukses", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<OrderClient orderId={ORDER_ID} />);

    const copyButton = await screen.findByRole("button", { name: "Salin nomor pesanan ORD-1760832000000-0192f0b0" });
    fireEvent.click(copyButton);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("ORD-1760832000000-0192f0b0"));
    expect(screen.getByRole("status")).toHaveTextContent("Nomor pesanan berhasil disalin.");
  });

  it("menampilkan arahan salin manual ketika clipboard gagal", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Ditolak"));
    Object.assign(navigator, { clipboard: { writeText } });
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Salin nomor pesanan ORD-1760832000000-0192f0b0/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Salin nomor pesanan ORD-1760832000000-0192f0b0/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Nomor tidak dapat disalin otomatis");
  });

  it("meratakan metadata status header ke kiri sesuai QA", async () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.order-header-meta \{[^}]*justify-items: start;[^}]*text-align: left;/);

    render(<OrderClient orderId={ORDER_ID} />);
    expect(await screen.findByText("Terakhir diperbarui", { exact: false })).toBeInTheDocument();
  });

  it("menampilkan status dan item dari API dengan struktur detail pesanan terbaru", async () => {
    getOrderMock.mockResolvedValue(order({ status: "paid" }));
    render(<OrderClient orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText("Dibayar")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Progres Pesanan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Item Pesanan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Butuh Bantuan?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Laporkan kendala" })).toHaveClass("button-warning");
    expect(screen.getAllByRole("button", { name: /Salin nomor pesanan/ })).toHaveLength(1);
    expect(screen.getAllByText("Netflix Premium")).toHaveLength(1);
    expect(screen.getByText(/1 Bulan × 1/)).toBeInTheDocument();
  });

  it("menegakkan cooldown kode otomatis dari metadata server dan mempertahankannya setelah render ulang", async () => {
    const cooldownUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    getOrderMock.mockResolvedValue(order({ status: "processing" }));
    listAccessMock.mockResolvedValue({
      otp_inbox_ready: true,
      items: [{
        order_item_id: "0192f0b2-0000-0000-0000-000000000001",
        product_name: "Netflix Premium",
        duration_name: "1 Bulan",
        account_label: "Akun keluarga",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "valid",
        access_code_expires_at: cooldownUntil,
        code_cooldown_until: cooldownUntil,
      }],
    });

    const first = render(<OrderClient orderId={ORDER_ID} />);
    expect(await screen.findByText("Kode akses sudah dikirim lewat email")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kirim ulang kode akses/ })).not.toBeInTheDocument();
    expect(issueCodeMock).not.toHaveBeenCalled();

    first.unmount();
    listAccessMock.mockResolvedValue({
      otp_inbox_ready: true,
      items: [{
        order_item_id: "0192f0b2-0000-0000-0000-000000000001",
        product_name: "Netflix Premium",
        duration_name: "1 Bulan",
        account_label: "Akun keluarga",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "expired",
      }],
    });
    render(<OrderClient orderId={ORDER_ID} />);
    expect(await screen.findByText(/Kode akses dari email pengiriman sudah kedaluwarsa/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kirim ulang kode akses/ })).not.toBeInTheDocument();
  });

  it("memulai cooldown lima menit setelah API mengirim ulang kode tanpa mengandalkan timer sebagai enforcement server", async () => {
    getOrderMock.mockResolvedValue(order({ status: "processing" }));
    listAccessMock.mockResolvedValue({
      otp_inbox_ready: true,
      items: [{
        order_item_id: "0192f0b2-0000-0000-0000-000000000001",
        product_name: "Netflix Premium",
        duration_name: "1 Bulan",
        account_label: "Akun keluarga",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "expired",
      }],
    });
    issueCodeMock.mockResolvedValue({
      code: "ABCD234567",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      emails: ["family@example.test"],
      email_sent: true,
    });

    render(<OrderClient orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Kirim ulang kode akses" }));

    await waitFor(() => expect(issueCodeMock).toHaveBeenCalledWith(ORDER_ID, "0192f0b2-0000-0000-0000-000000000001"));
    expect(screen.getByRole("button", { name: /Buat ulang dalam/ })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Kode akses berlaku 5 menit");
  });

  it("mengikuti kontrak 429 backend untuk enforcement cooldown", async () => {
    getOrderMock.mockResolvedValue(order({ status: "processing" }));
    listAccessMock.mockResolvedValue({
      otp_inbox_ready: true,
      items: [{
        order_item_id: "0192f0b2-0000-0000-0000-000000000001",
        product_name: "Netflix Premium",
        duration_name: "1 Bulan",
        account_label: "Akun keluarga",
        account_email: "family@example.test",
        otp_ready: true,
        access_code_status: "expired",
      }],
    });
    issueCodeMock.mockRejectedValue(new ApiError(ACCESS_COOLDOWN_COPY, 429, {
      code: "otp_access_code_cooldown",
      retry_after: 300,
      cooldown_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }));

    render(<OrderClient orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Kirim ulang kode akses" }));

    expect(await screen.findByText(ACCESS_COOLDOWN_COPY)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kirim ulang kode akses" })).not.toBeInTheDocument();
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
