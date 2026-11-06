import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { archiveOrderMock, listOrdersMock, bootstrapAuthMock } = vi.hoisted(() => ({
  archiveOrderMock: vi.fn(),
  listOrdersMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    checkoutApi: { ...actual.checkoutApi, listOrders: listOrdersMock, archiveOrder: archiveOrderMock },
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
    archiveOrderMock.mockReset();
    listOrdersMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "usr-1", role: "customer" });
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    listOrdersMock.mockResolvedValue({
      orders: [order(1), order(2)],
      page: 1,
      per_page: 5,
      total: 2,
    });
  });

  it("memakai hero biru yang menutup judul dan seluruh body text", async () => {
    render(<OrderHistoryClient />);

    const heading = await screen.findByRole("heading", { name: "Riwayat pesanan" });
    const hero = heading.closest("header");
    expect(hero).toHaveClass("orders-hero");
    expect(hero).toHaveTextContent(/Semua pesanan.*akses layanan/);

    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.orders-hero\s*\{[^}]*background: #4c1ef9;/);
    expect(css).toMatch(/\.orders-hero\s*\{[^}]*padding: 54px 0 42px;/);
  });

  it("menyalin nomor pesanan langsung dari kartu riwayat tanpa membuka detail", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    const copyButton = screen.getByRole("button", { name: "Salin nomor pesanan ORD-W12-1" });
    fireEvent.click(copyButton);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("ORD-W12-1"));
    expect(copyButton).toHaveTextContent("Tersalin");
  });

  it("memberi arahan salin manual ketika Clipboard API tidak tersedia", async () => {
    Object.assign(navigator, { clipboard: {} });
    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Salin nomor pesanan ORD-W12-1" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pilih teks nomor pesanan lalu salin secara manual",
    );
  });

  it("memuat pesanan milik pengguna dan menautkan setiap baris ke detail", async () => {
    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    expect(bootstrapAuthMock).toHaveBeenCalledTimes(1);
    expect(listOrdersMock).toHaveBeenCalledWith({ page: 1, per_page: 5 });
    expect(screen.getByText("ORD-W12-2")).toBeInTheDocument();
    expect(screen.getAllByText("Rp186.000")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Lihat detail pesanan ORD-W12-1" })).toHaveAttribute(
      "href",
      "/orders/0192f0b0-0000-0000-0000-000000000001",
    );
    expect(screen.getByText(/Menampilkan 1–2 dari 2 pesanan/)).toBeInTheDocument();
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.orders-summary \{[^}]*margin-bottom: 8px;/);
    expect(screen.queryByRole("button", { name: "Hapus pesanan ORD-W12-1 dari riwayat" })).not.toBeInTheDocument();
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

  it("meminta konfirmasi sebelum menghapus pesanan yang dapat diarsipkan", async () => {
    listOrdersMock.mockResolvedValue({
      orders: [order(1, { status: "cancelled" })],
      page: 1,
      per_page: 5,
      total: 1,
    });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Hapus pesanan ORD-W12-1 dari riwayat" }));

    expect(screen.getByRole("alertdialog", { name: "Hapus dari riwayat pesanan?" })).toBeInTheDocument();
    expect(screen.getByText(/bukan menghapus data transaksi secara permanen/)).toBeInTheDocument();
    expect(archiveOrderMock).not.toHaveBeenCalled();
  });

  it("mengarsipkan pesanan setelah konfirmasi lalu memuat ulang daftar", async () => {
    listOrdersMock
      .mockResolvedValueOnce({ orders: [order(1, { status: "cancelled" })], page: 1, per_page: 5, total: 1 })
      .mockResolvedValueOnce({ orders: [], page: 1, per_page: 5, total: 0 });
    archiveOrderMock.mockResolvedValue(undefined);

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Hapus pesanan ORD-W12-1 dari riwayat" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus dari riwayat" }));

    await waitFor(() => expect(archiveOrderMock).toHaveBeenCalledWith("0192f0b0-0000-0000-0000-000000000001"));
    await waitFor(() => expect(screen.getByText("Belum ada pesanan")).toBeInTheDocument());
    expect(listOrdersMock).toHaveBeenCalledTimes(2);
  });

  it("mempertahankan item dan menjelaskan konflik 409 saat pengarsipan", async () => {
    listOrdersMock.mockResolvedValue({
      orders: [order(1, { status: "cancelled" })],
      page: 1,
      per_page: 5,
      total: 1,
    });
    archiveOrderMock.mockRejectedValue(new ApiError("Pesanan aktif", 409, { code: "order_active" }));

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Hapus pesanan ORD-W12-1 dari riwayat" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus dari riwayat" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Pesanan aktif atau sedang diproses/);
    expect(screen.getByText("ORD-W12-1")).toBeInTheDocument();
  });

  it("mempertahankan item dan menjelaskan galat jaringan saat pengarsipan", async () => {
    listOrdersMock.mockResolvedValue({
      orders: [order(1, { status: "cancelled" })],
      page: 1,
      per_page: 5,
      total: 1,
    });
    archiveOrderMock.mockRejectedValue(new Error("Network error"));

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Hapus pesanan ORD-W12-1 dari riwayat" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus dari riwayat" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Gagal menghapus pesanan dari riwayat/);
    expect(screen.getByText("ORD-W12-1")).toBeInTheDocument();
  });

  it("kembali ke halaman sebelumnya setelah item terakhir halaman diarsipkan", async () => {
    listOrdersMock
      .mockResolvedValueOnce({
        orders: Array.from({ length: 5 }, (_, index) => order(index + 1, { status: "cancelled" })),
        page: 1,
        per_page: 5,
        total: 6,
      })
      .mockResolvedValueOnce({
        orders: [order(6, { status: "cancelled" })],
        page: 2,
        per_page: 5,
        total: 6,
      })
      .mockResolvedValueOnce({
        orders: Array.from({ length: 5 }, (_, index) => order(index + 1, { status: "cancelled" })),
        page: 1,
        per_page: 5,
        total: 5,
      });
    archiveOrderMock.mockResolvedValue(undefined);

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    await waitFor(() => expect(screen.getByText("ORD-W12-6")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Hapus pesanan ORD-W12-6 dari riwayat" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus dari riwayat" }));

    await waitFor(() => expect(listOrdersMock).toHaveBeenLastCalledWith({ page: 1, per_page: 5 }));
    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    expect(screen.getByText(/Menampilkan 1–5 dari 5 pesanan/)).toBeInTheDocument();
  });

  it("kembali ke halaman terakhir saat total menyusut di tengah pagination", async () => {
    listOrdersMock
      .mockResolvedValueOnce({
        orders: Array.from({ length: 5 }, (_, index) => order(index + 1)),
        page: 1,
        per_page: 5,
        total: 7,
      })
      .mockResolvedValueOnce({ orders: [], page: 2, per_page: 5, total: 1 })
      .mockResolvedValueOnce({ orders: [order(11)], page: 1, per_page: 5, total: 1 });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));

    // Request page 2 mengembalikan daftar kosong tetapi total masih 1, jadi
    // komponen harus mundur ke page 1 dan fetch ulang, bukan menampilkan
    // empty state "Belum ada pesanan".
    await waitFor(() => expect(listOrdersMock).toHaveBeenLastCalledWith({ page: 1, per_page: 5 }));
    await waitFor(() => expect(screen.getByText("ORD-W12-11")).toBeInTheDocument());
    expect(screen.queryByText("Belum ada pesanan")).not.toBeInTheDocument();
    expect(listOrdersMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/Menampilkan 1–1 dari 1 pesanan/)).toBeInTheDocument();
  });

  it("memilih semua pesanan yang boleh diarsipkan lalu menghapusnya setelah konfirmasi", async () => {
    const archivableOne = order(1, { status: "cancelled" });
    const archivableTwo = order(2, { status: "delivered" });
    const active = order(3, { status: "paid" });
    listOrdersMock
      .mockResolvedValueOnce({ orders: [archivableOne, archivableTwo, active], page: 1, per_page: 5, total: 3 })
      .mockResolvedValueOnce({ orders: [active], page: 1, per_page: 5, total: 1 });
    archiveOrderMock.mockResolvedValue(undefined);

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-3")).toBeInTheDocument());
    expect(screen.queryByRole("checkbox", { name: "Pilih pesanan ORD-W12-3" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Pilih semua" }));
    expect(screen.getByText("2 pesanan dipilih")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus terpilih" }));

    expect(screen.getByRole("alertdialog", { name: "Hapus 2 pesanan dari riwayat?" })).toBeInTheDocument();
    expect(screen.getByText(/2 pesanan yang dipilih/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus 2 pesanan" }));

    await waitFor(() => expect(archiveOrderMock).toHaveBeenCalledTimes(2));
    expect(archiveOrderMock.mock.calls.map(([id]) => id)).toEqual([archivableOne.id, archivableTwo.id]);
    expect(await screen.findByText("2 pesanan berhasil dihapus dari riwayat.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("ORD-W12-3")).toBeInTheDocument());
    expect(screen.queryByText("ORD-W12-1")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Pilih semua" })).not.toBeInTheDocument();
  });

  it("melaporkan kegagalan parsial tanpa menyembunyikan pesanan yang gagal", async () => {
    const first = order(1, { status: "cancelled" });
    const second = order(2, { status: "completed" });
    listOrdersMock
      .mockResolvedValueOnce({ orders: [first, second], page: 1, per_page: 5, total: 2 })
      .mockResolvedValueOnce({ orders: [second], page: 1, per_page: 5, total: 1 });
    archiveOrderMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError("Pesanan aktif", 409, { code: "order_active" }));

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-2")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: "Pilih semua" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus terpilih" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus 2 pesanan" }));

    await waitFor(() => expect(archiveOrderMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1 pesanan berhasil dihapus, 1 gagal dihapus",
    );
    await waitFor(() => expect(screen.queryByText("ORD-W12-1")).not.toBeInTheDocument());
    expect(screen.getByText("ORD-W12-2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pilih pesanan ORD-W12-2" })).toBeChecked();
  });

  it("memuat lima riwayat per halaman memakai parameter pagination API", async () => {
    listOrdersMock.mockResolvedValue({
      orders: Array.from({ length: 5 }, (_, index) => order(index + 1)),
      page: 1,
      per_page: 5,
      total: 7,
    });

    render(<OrderHistoryClient />);

    await waitFor(() => expect(screen.getByText("ORD-W12-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));

    await waitFor(() => expect(listOrdersMock).toHaveBeenLastCalledWith({ page: 2, per_page: 5 }));
    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Berikutnya/ })).toBeDisabled();
  });
});
