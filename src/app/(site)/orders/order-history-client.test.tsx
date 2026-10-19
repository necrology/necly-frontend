import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listOrdersMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listOrdersMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    checkoutApi: { ...actual.checkoutApi, listOrders: listOrdersMock },
  };
});

import { ApiError } from "@/lib/api";
import { OrderHistoryClient } from "./order-history-client";

function order(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `0192f0b0-0000-0000-0000-${String(index).padStart(12, "0")}`,
    number: `ORD-W12-${index}`,
    status: index % 2 === 0 ? "paid" : "processing",
    subtotal: 186_000,
    discount: 0,
    total: 186_000,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:00:00Z",
    items: [
      {
        id: `item-${index}`,
        product_price_id: "0192f0a4-0000-0000-0000-000000000001",
        product_name: "Netflix Premium",
        duration_name: "1 Bulan",
        unit_price: 186_000,
        quantity: 1,
        device_count: 1,
        line_total: 186_000,
      },
    ],
    ...overrides,
  };
}

describe("riwayat pesanan pelanggan", () => {
  beforeEach(() => {
    listOrdersMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "usr-1", role: "customer" });
    listOrdersMock.mockResolvedValue({
      orders: [order(1), order(2)],
      page: 1,
      per_page: 10,
      total: 2,
    });
  });

  it("memuat pesanan milik pengguna dan menautkan setiap baris ke detail", async () => {
    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    expect(bootstrapAuthMock).toHaveBeenCalledTimes(1);
    expect(listOrdersMock).toHaveBeenCalledWith({ page: 1, per_page: 10 });
    expect(screen.getByText("ORD-W12-2")).toBeInTheDocument();
    expect(screen.getAllByText("Rp186.000")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Lihat detail pesanan ORD-W12-1" })).toHaveAttribute(
      "href",
      "/orders/0192f0b0-0000-0000-0000-000000000001",
    );
    expect(screen.getByText(/Menampilkan 1–2 dari 2 pesanan/)).toBeInTheDocument();
  });

  it("memakai state kosong tanpa data contoh saat API tidak mengembalikan pesanan", async () => {
    listOrdersMock.mockResolvedValue({ orders: [], page: 1, per_page: 10, total: 0 });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("Belum ada pesanan")).toBeInTheDocument());
    expect(screen.queryByText("Netflix Premium")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat layanan" })).toHaveAttribute("href", "/products");
  });

  it("menampilkan galat 500 dan bisa mencoba ulang", async () => {
    listOrdersMock
      .mockRejectedValueOnce(new ApiError("Gagal mengambil riwayat pesanan", 500, null))
      .mockResolvedValueOnce({ orders: [order(3)], page: 1, per_page: 10, total: 1 });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("Tidak dapat memuat pesanan")).toBeInTheDocument());
    expect(screen.queryByText("ORD-W12-3")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Coba lagi/ }));

    await waitFor(() => expect(screen.getByText("ORD-W12-3")).toBeInTheDocument());
    expect(listOrdersMock).toHaveBeenCalledTimes(2);
  });

  it("meminta pengguna masuk ketika sesi tidak dapat dipulihkan", async () => {
    bootstrapAuthMock.mockResolvedValue(null);

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("Masuk untuk melihat pesanan")).toBeInTheDocument());
    expect(listOrdersMock).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login?redirect=%2Forders");
  });

  it("menganggap 401 dari API sebagai sesi berakhir, bukan galat umum", async () => {
    listOrdersMock.mockRejectedValue(new ApiError("Unauthorized", 401, null));

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("Masuk untuk melihat pesanan")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Coba lagi/ })).not.toBeInTheDocument();
  });

  it("menolak respons yang tidak sesuai kontrak tanpa menampilkan data palsu", async () => {
    listOrdersMock.mockResolvedValue({ orders: null, page: 1, per_page: 10, total: 0 });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("Tidak dapat memuat pesanan")).toBeInTheDocument());
    expect(screen.getByText(/tidak sesuai kontrak/)).toBeInTheDocument();
  });

  it("menolak elemen orders yang tidak sesuai kontrak tanpa RpNaN atau tautan undefined", async () => {
    listOrdersMock.mockResolvedValue({
      orders: [{ number: "BROKEN", status: "paid", items: [] }],
      page: 1,
      per_page: 10,
      total: 1,
    });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("Tidak dapat memuat pesanan")).toBeInTheDocument());
    expect(screen.getByText(/tidak sesuai kontrak/)).toBeInTheDocument();
    expect(screen.queryByText("BROKEN")).not.toBeInTheDocument();
    expect(screen.queryByText(/RpNaN/)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="/orders/undefined"]')).toBeNull();
  });

  it("kembali ke halaman terakhir saat total menyusut di tengah pagination", async () => {
    listOrdersMock
      .mockResolvedValueOnce({
        orders: Array.from({ length: 10 }, (_, index) => order(index + 1)),
        page: 1,
        per_page: 10,
        total: 12,
      })
      .mockResolvedValueOnce({ orders: [], page: 2, per_page: 10, total: 1 })
      .mockResolvedValueOnce({ orders: [order(11)], page: 1, per_page: 10, total: 1 });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));

    // Request page 2 mengembalikan daftar kosong tetapi total masih 1, jadi
    // komponen harus mundur ke page 1 dan fetch ulang, bukan menampilkan
    // empty state "Belum ada pesanan".
    await waitFor(() => expect(listOrdersMock).toHaveBeenLastCalledWith({ page: 1, per_page: 10 }));
    await waitFor(() => expect(screen.getByText("ORD-W12-11")).toBeInTheDocument());
    expect(screen.queryByText("Belum ada pesanan")).not.toBeInTheDocument();
    expect(listOrdersMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/Menampilkan 1–1 dari 1 pesanan/)).toBeInTheDocument();
  });

  it("memuat halaman berikutnya memakai parameter pagination API", async () => {
    listOrdersMock.mockResolvedValue({
      orders: Array.from({ length: 10 }, (_, index) => order(index + 1)),
      page: 1,
      per_page: 10,
      total: 12,
    });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));

    await waitFor(() => expect(listOrdersMock).toHaveBeenLastCalledWith({ page: 2, per_page: 10 }));
    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Berikutnya/ })).toBeDisabled();
  });
});
