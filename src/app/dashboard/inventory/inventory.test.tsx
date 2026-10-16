import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InventoryPage from "./page";

const { listProductsMock, listAccountsMock, createSlotsMock, createAccountMock } = vi.hoisted(() => ({
  listProductsMock: vi.fn(),
  listAccountsMock: vi.fn(),
  createSlotsMock: vi.fn(),
  createAccountMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  bootstrapAuth: vi.fn().mockResolvedValue({ id: "usr-1", role: "admin" }),
  catalogApi: { listProducts: listProductsMock },
  adminApi: {
    listInventoryAccounts: listAccountsMock,
    createInventoryAccount: createAccountMock,
    createInventorySlots: createSlotsMock,
  },
}));

// Bentuk payload katalog apa adanya: ketersediaan datang sebagai available_slots.
const product = {
  id: "prd-1",
  name: "Netflix Premium",
  slug: "netflix-premium",
  description: "Streaming 4K",
  category: { id: "cat-1", name: "Streaming", slug: "streaming" },
  prices: [
    { id: "0192f0a4-0000-0000-0000-000000000001", amount: 186_000, active: true, available_slots: 0, duration: { id: "d-1", name: "1 Bulan", days: 30 } },
    { id: "0192f0a4-0000-0000-0000-000000000002", amount: 1_900_000, active: true, available_slots: 4, duration: { id: "d-2", name: "12 Bulan", days: 365 } },
  ],
};

describe("Halaman Inventaris", () => {
  beforeEach(() => {
    listProductsMock.mockReset().mockResolvedValue({ products: [product], page: 1, per_page: 100, total: 1 });
    listAccountsMock.mockReset().mockResolvedValue({ accounts: [], page: 1, per_page: 100, total: 0 });
    createSlotsMock.mockReset().mockResolvedValue({ created: 10 });
    createAccountMock.mockReset().mockResolvedValue({ id: "acc-1" });
  });

  // Slot dicatat per harga paket, jadi tiap paket punya barisnya sendiri dengan
  // angka dari available_slots — bukan satu angka untuk seluruh produk.
  it("menampilkan satu baris per paket dengan slot dari katalog", async () => {
    render(<InventoryPage />);

    await screen.findByText("1 bulan");
    expect(screen.getByText("12 bulan")).toBeInTheDocument();

    // Baris 12 bulan berisi 4 slot dari available_slots; baris 1 bulan kosong.
    const row = screen.getByText("12 bulan").closest("tr");
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain("4");
    expect(screen.getByText("1 bulan").closest("tr")?.textContent).toContain("0");
  });

  it("mengirim jumlah slot yang diminta, dengan 10 sebagai usulan awal", async () => {
    listAccountsMock.mockResolvedValue({ accounts: [{ id: "acc-1", product_id: "prd-1", status: "active" }], page: 1, per_page: 100, total: 1 });

    render(<InventoryPage />);
    await screen.findByText("1 bulan");

    fireEvent.click(screen.getAllByRole("button", { name: /Slot/ })[0]);

    expect(screen.getByLabelText("Jumlah slot")).toHaveValue(10);
    fireEvent.click(screen.getByRole("button", { name: "Tambah slot" }));

    await waitFor(() => expect(createSlotsMock).toHaveBeenCalledWith({ product_price_id: "0192f0a4-0000-0000-0000-000000000001", quantity: 10 }));
    // Akun induknya sudah ada, jadi tidak ada akun baru yang dibuat.
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  // inventory_slots.inventory_account_id NOT NULL: tanpa akun induk, barisnya
  // tidak bisa dibuat, jadi kredensialnya diminta lebih dulu di form yang sama.
  it("meminta kredensial akun induk bila produknya belum punya akun", async () => {
    render(<InventoryPage />);
    await screen.findByText("1 bulan");

    fireEvent.click(screen.getAllByRole("button", { name: /Slot/ })[0]);

    expect(screen.getByText(/belum punya akun induk/i)).toBeInTheDocument();

    // Tanpa kredensial tidak ada yang dikirim ke server.
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun & tambah slot" }));
    expect(createAccountMock).not.toHaveBeenCalled();
    expect(createSlotsMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Kredensial akun induk"), { target: { value: "induk@necly.id:rahasia" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun & tambah slot" }));

    await waitFor(() => expect(createAccountMock).toHaveBeenCalledWith({ product_id: "prd-1", credentials: "induk@necly.id:rahasia" }));
    await waitFor(() => expect(createSlotsMock).toHaveBeenCalledWith({ product_price_id: "0192f0a4-0000-0000-0000-000000000001", quantity: 10 }));
  });

  // Batas 1..100 dijaga di dua lapis: atribut min/max pada input menahannya di
  // peramban, dan handler tetap memeriksanya sendiri. Yang penting, angka di
  // luar rentang tidak pernah sampai ke server.
  it("tidak mengirim jumlah di luar 1 sampai 100", async () => {
    listAccountsMock.mockResolvedValue({ accounts: [{ id: "acc-1", product_id: "prd-1", status: "active" }], page: 1, per_page: 100, total: 1 });

    render(<InventoryPage />);
    await screen.findByText("1 bulan");

    fireEvent.click(screen.getAllByRole("button", { name: /Slot/ })[0]);
    const input = screen.getByLabelText("Jumlah slot") as HTMLInputElement;
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "100");

    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah slot" }));

    expect(createSlotsMock).not.toHaveBeenCalled();
  });
});
