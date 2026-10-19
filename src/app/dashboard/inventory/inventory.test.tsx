import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bootstrapAuthMock,
  listProductsMock,
  listAccountsMock,
  listSlotsMock,
  createAccountMock,
  updateAccountMock,
  createSlotsMock,
} = vi.hoisted(() => ({
  bootstrapAuthMock: vi.fn(),
  listProductsMock: vi.fn(),
  listAccountsMock: vi.fn(),
  listSlotsMock: vi.fn(),
  createAccountMock: vi.fn(),
  updateAccountMock: vi.fn(),
  createSlotsMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: {
      ...actual.adminApi,
      listProducts: listProductsMock,
      listInventoryAccounts: listAccountsMock,
      listInventorySlots: listSlotsMock,
      createInventoryAccount: createAccountMock,
      updateInventoryAccount: updateAccountMock,
      createInventorySlots: createSlotsMock,
    },
  };
});

import InventoryPage from "./page";
import { ApiError } from "@/lib/api";

const PRODUCT = {
  id: "prd-1",
  name: "Netflix Premium",
  slug: "netflix-premium",
  description: "Streaming 4K",
  prices: [
    { id: "price-1", amount: 186_000, active: true, duration_name: "1 Bulan", duration_days: 30 },
    { id: "price-2", amount: 1_900_000, active: true, duration_name: "12 Bulan", duration_days: 365 },
  ],
};

const ACCOUNT = {
  id: "acc-1",
  product_id: "prd-1",
  product: PRODUCT,
  label: "Akun utama",
  status: "active",
  sharing_limit: 5,
  expires_at: "2026-12-31T00:00:00Z",
  total_slots: 3,
  available_slots: 1,
  used_slots: 2,
  remaining_slots: 2,
  sellable: true,
};

const SECOND_ACCOUNT = {
  ...ACCOUNT,
  id: "acc-2",
  label: "Akun cadangan",
  sharing_limit: 2,
  total_slots: 2,
  available_slots: 2,
  used_slots: 0,
  remaining_slots: 0,
};

const SLOT = {
  id: "slot-1",
  inventory_account_id: "acc-1",
  product_price_id: "price-1",
  status: "reserved",
  order_id: "0192f0b0-0000-0000-0000-000000000001",
  order_number: "ORD-001",
  reserved_name: "Budi Pelanggan",
  reserved_email: "budi@example.test",
  reserved_until: "2026-11-01T00:00:00Z",
  created_at: "2026-10-01T10:00:00Z",
};

function mockAccounts(accounts: unknown[] = [ACCOUNT, SECOND_ACCOUNT]) {
  listAccountsMock.mockResolvedValue({ accounts, page: 1, per_page: 100, total: accounts.length });
}

describe("Halaman Inventaris akun", () => {
  beforeEach(() => {
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    listProductsMock.mockReset().mockResolvedValue({ products: [PRODUCT], page: 1, per_page: 100, total: 1 });
    listAccountsMock.mockReset();
    mockAccounts();
    listSlotsMock.mockReset().mockResolvedValue({ slots: [SLOT], page: 1, per_page: 100, total: 1 });
    createAccountMock.mockReset().mockResolvedValue({ ...ACCOUNT, id: "acc-new" });
    updateAccountMock.mockReset().mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...ACCOUNT, id, ...data }),
    );
    createSlotsMock.mockReset().mockImplementation((data: { quantity: number; inventory_account_id: string }) =>
      Promise.resolve({ created: data.quantity, inventory_account_id: data.inventory_account_id }),
    );
  });

  it("menampilkan akun per produk dengan status, expiry, limit sharing, dan kapasitas slot", async () => {
    render(<InventoryPage />);

    await screen.findByText("Akun utama");
    const row = screen.getByText("Akun utama").closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Netflix Premium")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Aktif")).toBeInTheDocument();
    expect(row?.textContent).toContain("2 / 3");
    expect(row?.textContent).toContain("1 tersedia");
    expect(row?.textContent).toContain("5");

    // Akun kedua berkapasitas penuh tetap tampil; metrik total berasal dari API.
    expect(screen.getByText("Akun cadangan")).toBeInTheDocument();
    expect(screen.getByText("Slot tersedia").closest("article")?.textContent).toContain("3");
  });

  it("menampilkan assignment order dan pengguna secara read-only saat diminta", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat assignment Akun utama" }));

    await waitFor(() => expect(listSlotsMock).toHaveBeenCalledWith("acc-1", { page: 1, per_page: 100 }));
    await screen.findByText("ORD-001");
    expect(screen.getByText("Budi Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Netflix Premium · 1 Bulan")).toBeInTheDocument();
    expect(screen.getByText("Direservasi")).toBeInTheDocument();
  });

  it("mengedit label/status/limit dengan konfirmasi dan tidak pernah menampilkan kredensial", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akun Akun utama" }));
    const credentials = screen.getByLabelText("Kredensial baru (opsional)") as HTMLTextAreaElement;
    expect(credentials).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Label akun"), { target: { value: "Akun cadangan baru" } });
    fireEvent.change(screen.getByLabelText("Status akun"), { target: { value: "inactive" } });
    fireEvent.change(screen.getByLabelText("Limit sharing"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    // Klik pertama hanya meminta konfirmasi; belum ada PATCH.
    expect(updateAccountMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Konfirmasi perubahan akun Akun utama/)).toBeInTheDocument();
    expect(screen.getByText(/status Aktif → Nonaktif/)).toBeInTheDocument();
    expect(screen.getByText(/limit sharing 5 → 4/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    await waitFor(() =>
      expect(updateAccountMock).toHaveBeenCalledWith("acc-1", {
        label: "Akun cadangan baru",
        status: "inactive",
        sharing_limit: 4,
      }),
    );
    await screen.findByText(/Akun "Akun cadangan baru" diperbarui/);
    expect(updateAccountMock.mock.calls[0]?.[1]).not.toHaveProperty("credentials");
    expect(screen.queryByDisplayValue(/rahasia/i)).not.toBeInTheDocument();
  });

  it("mengirim kredensial baru hanya bila field diisi", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akun Akun utama" }));
    fireEvent.change(screen.getByLabelText("Kredensial baru (opsional)"), {
      target: { value: "email-baru@necly.id:kata-sandi-baru" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(screen.getByText(/kredensial diganti/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    await waitFor(() =>
      expect(updateAccountMock).toHaveBeenCalledWith("acc-1", {
        credentials: "email-baru@necly.id:kata-sandi-baru",
      }),
    );
  });

  it("menambah slot pada akun yang dipilih dan meneruskan inventory_account_id", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah slot ke Akun utama" }));
    expect(screen.getByLabelText("Akun")).toHaveValue("acc-1");
    expect(screen.getByLabelText("Paket")).toHaveValue("price-1");

    fireEvent.change(screen.getByLabelText("Jumlah slot"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan slot" }));

    await waitFor(() =>
      expect(createSlotsMock).toHaveBeenCalledWith({
        product_price_id: "price-1",
        quantity: 2,
        inventory_account_id: "acc-1",
      }),
    );
    await screen.findByText(/2 slot ditambahkan ke akun "Akun utama"/);
  });

  it("menolak jumlah slot yang melebihi sisa kapasitas tanpa memanggil API", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah slot ke Akun utama" }));
    fireEvent.change(screen.getByLabelText("Jumlah slot"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan slot" }));

    expect(createSlotsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Jumlah melebihi kapasitas akun\. Sisa kapasitas Akun utama: 2 slot/)).toBeInTheDocument();
  });

  it("menampilkan error 409 sharing_limit_exceeded secara jelas", async () => {
    createSlotsMock.mockRejectedValueOnce(
      new ApiError("kapasitas penuh", 409, { error: "akun penuh", code: "sharing_limit_exceeded" }),
    );

    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah slot ke Akun utama" }));
    fireEvent.change(screen.getByLabelText("Jumlah slot"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan slot" }));

    await screen.findByText(/Limit sharing tercapai/);
    expect(createSlotsMock).toHaveBeenCalledTimes(1);
  });

  it("menampilkan konfirmasi sebelum menonaktifkan akun", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Nonaktifkan akun Akun utama" }));
    expect(screen.getByText(/Konfirmasi: nonaktifkan akun Akun utama/)).toBeInTheDocument();
    expect(updateAccountMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ya, nonaktifkan" }));
    await waitFor(() => expect(updateAccountMock).toHaveBeenCalledWith("acc-1", { status: "inactive" }));
    await screen.findByText(/Akun "Akun utama" dinonaktifkan/);
  });

  it("membuat akun baru lalu mengosongkan kredensial setelah disimpan", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akun" }));
    fireEvent.change(screen.getByLabelText("Label akun"), { target: { value: "Akun baru" } });
    fireEvent.change(screen.getByLabelText("Kredensial akun"), {
      target: { value: "akun-baru@necly.id:kata-sandi" },
    });
    fireEvent.change(screen.getByLabelText("Limit sharing"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun" }));

    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith({
        product_id: "prd-1",
        label: "Akun baru",
        credentials: "akun-baru@necly.id:kata-sandi",
        sharing_limit: 8,
      }),
    );
    await screen.findByText(/Akun "Akun baru" dibuat/);
    expect(screen.queryByLabelText("Kredensial akun")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("akun-baru@necly.id:kata-sandi")).not.toBeInTheDocument();
  });

  it("menerapkan status nonaktif pada akun baru lewat PATCH setelah create", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akun" }));
    fireEvent.change(screen.getByLabelText("Label akun"), { target: { value: "Akun nonaktif" } });
    fireEvent.change(screen.getByLabelText("Kredensial akun"), { target: { value: "akun@necly.id:sandi" } });
    fireEvent.change(screen.getByLabelText("Status akun"), { target: { value: "inactive" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun" }));

    await waitFor(() => expect(createAccountMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateAccountMock).toHaveBeenCalledWith("acc-new", { status: "inactive" }));
    expect(createAccountMock.mock.calls[0]?.[0]).not.toHaveProperty("status");
  });

  it("menolak akses non-admin tanpa memuat data inventaris", async () => {
    bootstrapAuthMock.mockResolvedValueOnce({ id: "customer-1", role: "customer" });

    render(<InventoryPage />);

    await screen.findByText(/Akses ditolak: hanya admin/);
    expect(listAccountsMock).not.toHaveBeenCalled();
  });

  it("menampilkan error muat dan tombol coba lagi", async () => {
    listAccountsMock.mockRejectedValueOnce(new ApiError("server down", 500, { error: "server down" }));

    render(<InventoryPage />);

    await screen.findByText("Tidak dapat memuat inventaris");
    expect(screen.getByText(/Gagal memproses inventaris \(HTTP 500\): server down/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
});
