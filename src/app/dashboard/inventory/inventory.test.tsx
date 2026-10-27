import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSearchableOption, searchableSelectedText } from "@/test/searchable-select";

const {
  bootstrapAuthMock,
  listProductsMock,
  listAccountsMock,
  listSlotsMock,
  createAccountMock,
  updateAccountMock,
  createSlotsMock,
  extendAccountMock,
  deactivateAccountMock,
  extendSlotMock,
  deactivateSlotMock,
} = vi.hoisted(() => ({
  bootstrapAuthMock: vi.fn(),
  listProductsMock: vi.fn(),
  listAccountsMock: vi.fn(),
  listSlotsMock: vi.fn(),
  createAccountMock: vi.fn(),
  updateAccountMock: vi.fn(),
  createSlotsMock: vi.fn(),
  extendAccountMock: vi.fn(),
  deactivateAccountMock: vi.fn(),
  extendSlotMock: vi.fn(),
  deactivateSlotMock: vi.fn(),
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
      extendInventoryAccount: extendAccountMock,
      deactivateInventoryAccount: deactivateAccountMock,
      extendInventorySlot: extendSlotMock,
      deactivateInventorySlot: deactivateSlotMock,
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
    extendAccountMock.mockReset().mockResolvedValue(ACCOUNT);
    deactivateAccountMock.mockReset().mockResolvedValue({ ...ACCOUNT, status: "inactive" });
    extendSlotMock.mockReset().mockResolvedValue({ ...SLOT, access_expires_at: "2027-01-31T00:00:00Z" });
    deactivateSlotMock.mockReset().mockResolvedValue({ ...SLOT, status: "inactive" });
  });

  it("menampilkan akun per produk dengan status, expiry, limit sharing, dan kapasitas akses", async () => {
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
    expect(screen.getByText("Akses tersedia").closest("article")?.textContent).toContain("3");
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
    chooseSearchableOption("Status akun", "Nonaktif");
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

  it("menambah akses pada akun yang dipilih dan meneruskan inventory_account_id", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akses ke Akun utama" }));
    expect(searchableSelectedText("Akun")).toContain("Akun utama");
    expect(searchableSelectedText("Paket")).toBe("1 Bulan");

    fireEvent.change(screen.getByLabelText("Jumlah akses"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akses" }));

    // Simpan akses hanya meminta konfirmasi; belum ada POST.
    expect(createSlotsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Konfirmasi tambah akses: 2 akses pada akun "Akun utama"/)).toBeInTheDocument();
    expect(screen.getByText(/Sisa kapasitas setelah ditambahkan: 0 akses/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ya, tambahkan akses" }));

    await waitFor(() =>
      expect(createSlotsMock).toHaveBeenCalledTimes(1),
    );
    expect(createSlotsMock).toHaveBeenCalledWith({
      product_price_id: "price-1",
      quantity: 2,
      inventory_account_id: "acc-1",
    });
    await screen.findByText(/2 akses ditambahkan ke akun "Akun utama"/);
  });

  it("menolak jumlah akses yang melebihi sisa kapasitas tanpa memanggil API", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akses ke Akun utama" }));
    fireEvent.change(screen.getByLabelText("Jumlah akses"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akses" }));

    expect(createSlotsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Jumlah melebihi kapasitas akun\. Sisa kapasitas Akun utama: 2 akses/)).toBeInTheDocument();
  });

  it("menampilkan error 409 sharing_limit_exceeded secara jelas", async () => {
    createSlotsMock.mockRejectedValueOnce(
      new ApiError("kapasitas penuh", 409, { error: "akun penuh", code: "sharing_limit_exceeded" }),
    );

    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akses ke Akun utama" }));
    fireEvent.change(screen.getByLabelText("Jumlah akses"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akses" }));
    expect(createSlotsMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ya, tambahkan akses" }));

    await screen.findByText(/Limit sharing tercapai/);
    expect(createSlotsMock).toHaveBeenCalledTimes(1);
  });

  it("menampilkan konfirmasi sebelum menonaktifkan akun", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Nonaktifkan akun Akun utama" }));
    expect(screen.getByText(/Konfirmasi: nonaktifkan akun Akun utama/)).toBeInTheDocument();
    expect(deactivateAccountMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ya, nonaktifkan" }));
    await waitFor(() => expect(deactivateAccountMock).toHaveBeenCalledWith("acc-1"));
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
    chooseSearchableOption("Status akun", "Nonaktif");
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun" }));

    await waitFor(() => expect(createAccountMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateAccountMock).toHaveBeenCalledWith("acc-new", { status: "inactive" }));
    expect(createAccountMock.mock.calls[0]?.[0]).not.toHaveProperty("status");
  });

  it("menampilkan jumlah total akun dan memuat halaman akun berikutnya", async () => {
    listAccountsMock
      .mockResolvedValueOnce({ accounts: [ACCOUNT], page: 1, per_page: 100, total: 150 })
      .mockResolvedValueOnce({ accounts: [SECOND_ACCOUNT], page: 2, per_page: 100, total: 150 });

    render(<InventoryPage />);

    await screen.findByText("Akun utama");
    expect(screen.getByText("Menampilkan 1 dari 150 akun")).toBeInTheDocument();
    expect(screen.queryByText("Akun cadangan")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Muat lebih banyak akun" }));

    await waitFor(() =>
      expect(listAccountsMock).toHaveBeenLastCalledWith({ page: 2, per_page: 100 }),
    );
    await screen.findByText("Akun cadangan");
    expect(screen.getByText("Menampilkan 2 dari 150 akun")).toBeInTheDocument();
  });

  it("menampilkan total assignment dan memuat slot berikutnya", async () => {
    const secondSlot = {
      ...SLOT,
      id: "slot-2",
      status: "used",
      order_number: "ORD-002",
      reserved_name: "Sari Pelanggan",
    };
    listSlotsMock
      .mockResolvedValueOnce({ slots: [SLOT], page: 1, per_page: 100, total: 2 })
      .mockResolvedValueOnce({ slots: [secondSlot], page: 2, per_page: 100, total: 2 });

    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat assignment Akun utama" }));
    await screen.findByText("ORD-001");
    expect(screen.getByText("Menampilkan 1 dari 2 akses.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Muat assignment berikutnya" }));

    await waitFor(() =>
      expect(listSlotsMock).toHaveBeenLastCalledWith("acc-1", { page: 2, per_page: 100 }),
    );
    await screen.findByText("ORD-002");
    expect(screen.getByText("Menampilkan 2 dari 2 akses.")).toBeInTheDocument();
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

  it("mencari akun yang baru ada di halaman berikutnya dengan memuat sisa halaman", async () => {
    listAccountsMock
      .mockReset()
      .mockResolvedValueOnce({ accounts: [ACCOUNT], page: 1, per_page: 100, total: 150 })
      .mockResolvedValue({ accounts: [SECOND_ACCOUNT], page: 2, per_page: 100, total: 150 });

    render(<InventoryPage />);
    await screen.findByText("Akun utama");
    expect(screen.queryByText("Akun cadangan")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cari inventaris"), { target: { value: "cadangan" } });

    expect(await screen.findByText("Akun cadangan")).toBeInTheDocument();
    expect(listAccountsMock).toHaveBeenLastCalledWith({ page: 2, per_page: 100 });
  });

  it("mempertahankan halaman 2 setelah mutasi dan tidak kembali ke halaman 1", async () => {
    listAccountsMock.mockReset().mockImplementation(({ page }: { page?: number }) =>
      Promise.resolve(
        page === 2
          ? { accounts: [SECOND_ACCOUNT], page: 2, per_page: 100, total: 150 }
          : { accounts: [ACCOUNT], page: 1, per_page: 100, total: 150 },
      ),
    );

    render(<InventoryPage />);
    await screen.findByText("Akun utama");
    fireEvent.click(screen.getByRole("button", { name: "Muat lebih banyak akun" }));
    await screen.findByText("Akun cadangan");

    fireEvent.click(screen.getByRole("button", { name: "Nonaktifkan akun Akun cadangan" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, nonaktifkan" }));

    await waitFor(() => expect(deactivateAccountMock).toHaveBeenCalledWith("acc-2"));
    await waitFor(() => {
      const pageTwoCalls = listAccountsMock.mock.calls.filter(([params]) => params?.page === 2);
      expect(pageTwoCalls.length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText("Akun cadangan")).toBeInTheDocument();
  });

  it("menampilkan total server pada kartu akun inventaris dan label termuat", async () => {
    listAccountsMock.mockReset().mockResolvedValue({
      accounts: [ACCOUNT],
      page: 1,
      per_page: 100,
      total: 150,
    });

    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("1 termuat · 1 produk (dari halaman termuat)")).toBeInTheDocument();
  });

  it("menampilkan penanda H-7/H-1 dan akun yang sudah kedaluwarsa", async () => {
    const day = 24 * 60 * 60 * 1000;
    const h7 = {
      ...ACCOUNT,
      id: "acc-h7",
      label: "Akun H-7",
      expires_at: new Date(Date.now() + 3 * day).toISOString(),
      days_remaining: 3,
    };
    const h1 = {
      ...ACCOUNT,
      id: "acc-h1",
      label: "Akun H-1",
      expires_at: new Date(Date.now() + day).toISOString(),
      days_remaining: 1,
    };
    const expired = {
      ...ACCOUNT,
      id: "acc-expired",
      label: "Akun lewat",
      status: "expired",
      expires_at: new Date(Date.now() - day).toISOString(),
      days_remaining: 0,
      sellable: false,
    };
    listAccountsMock.mockReset().mockResolvedValue({
      accounts: [h7, h1, expired],
      page: 1,
      per_page: 100,
      total: 3,
    });

    render(<InventoryPage />);

    const h7Row = (await screen.findByText("Akun H-7")).closest("tr") as HTMLElement;
    const h1Row = screen.getByText("Akun H-1").closest("tr") as HTMLElement;
    const expiredRow = screen.getByText("Akun lewat").closest("tr") as HTMLElement;

    expect(within(h7Row).getByText("H-7")).toBeInTheDocument();
    expect(within(h1Row).getByText("H-1")).toBeInTheDocument();
    expect(within(expiredRow).getAllByText("Kedaluwarsa").length).toBeGreaterThan(0);
  });

  it("memperpanjang akun dengan konfirmasi dan memuat ulang dashboard", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Perpanjang akun Akun utama" }));
    expect(screen.getByLabelText("Durasi perpanjangan (hari)")).toHaveValue(30);
    fireEvent.change(screen.getByLabelText("Durasi perpanjangan (hari)"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Tinjau perpanjangan" }));

    expect(extendAccountMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Perpanjang akun "Akun utama" selama 45 hari/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ya, perpanjang" }));

    await waitFor(() => expect(extendAccountMock).toHaveBeenCalledWith("acc-1", { duration_days: 45 }));
    await screen.findByText(/Masa aktif akun "Akun utama" diperpanjang/);
    expect(listAccountsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("memperpanjang slot dengan payload durasi dan memperbarui assignment", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat assignment Akun utama" }));
    await screen.findByText("ORD-001");
    fireEvent.click(screen.getByRole("button", { name: "Perpanjang slot order ORD-001" }));
    fireEvent.change(screen.getByLabelText("Durasi perpanjangan (hari)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Tinjau perpanjangan" }));

    expect(extendSlotMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Perpanjang slot order ORD-001 pada akun "Akun utama" selama 10 hari/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ya, perpanjang" }));

    await waitFor(() => expect(extendSlotMock).toHaveBeenCalledWith("slot-1", { duration_days: 10 }));
    await screen.findByText(/Masa aktif slot order ORD-001 diperpanjang/);
  });

  it("menampilkan error validasi saat slot melewati masa aktif akun", async () => {
    extendSlotMock.mockRejectedValueOnce(
      new ApiError("slot would outlive account", 422, {
        error: "slot would outlive account",
        code: "slot_exceeds_account_expiry",
      }),
    );

    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat assignment Akun utama" }));
    await screen.findByText("ORD-001");
    fireEvent.click(screen.getByRole("button", { name: "Perpanjang slot order ORD-001" }));
    fireEvent.click(screen.getByRole("button", { name: "Tinjau perpanjangan" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, perpanjang" }));

    await screen.findByText(/Masa aktif slot tidak boleh melewati masa aktif akun/);
    expect(extendSlotMock).toHaveBeenCalledTimes(1);
  });

  it("menonaktifkan satu slot tanpa menghapus assignment", async () => {
    render(<InventoryPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat assignment Akun utama" }));
    await screen.findByText("ORD-001");
    fireEvent.click(screen.getByRole("button", { name: "Nonaktifkan slot order ORD-001" }));
    expect(screen.getByText(/Konfirmasi: nonaktifkan slot order ORD-001/)).toBeInTheDocument();
    expect(deactivateSlotMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ya, nonaktifkan slot" }));

    await waitFor(() => expect(deactivateSlotMock).toHaveBeenCalledWith("slot-1"));
    await screen.findByText(/Slot order ORD-001 pada akun "Akun utama" dinonaktifkan/);
  });
});
