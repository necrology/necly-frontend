import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bootstrapAuthMock,
  listProductsMock,
  listAccountsMock,
  listSlotsMock,
  getAccountMock,
  createAccountMock,
  updateAccountMock,
  deleteAccountMock,
  generateOtpMock,
  createSlotsMock,
} = vi.hoisted(() => ({
  bootstrapAuthMock: vi.fn(),
  listProductsMock: vi.fn(),
  listAccountsMock: vi.fn(),
  listSlotsMock: vi.fn(),
  getAccountMock: vi.fn(),
  createAccountMock: vi.fn(),
  updateAccountMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  generateOtpMock: vi.fn(),
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
      getInventoryAccount: getAccountMock,
      createInventoryAccount: createAccountMock,
      updateInventoryAccount: updateAccountMock,
      deleteInventoryAccount: deleteAccountMock,
      generateInventoryOTP: generateOtpMock,
      createInventorySlots: createSlotsMock,
    },
  };
});

import AccountsPage from "./page";
import { ApiError } from "@/lib/api";

const PRODUCT = {
  id: "prd-1",
  name: "Netflix Premium",
  slug: "netflix-premium",
  description: "Streaming 4K",
  prices: [
    { id: "price-1", amount: 186_000, active: true, duration_name: "1 Bulan", duration_days: 30 },
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
  days_remaining: 12,
  total_slots: 3,
  available_slots: 2,
  used_slots: 1,
  remaining_slots: 2,
  assigned_users: 1,
  otp_configured: true,
  account_email: "akun-utama@necly.test",
  otp_inbox_configured: true,
  otp_inbox_source: "direct",
  mailbox_app_password_configured: true,
  imap_host: "imap.gmail.com",
  needs_review: false,
  sellable: true,
};

const LEGACY_ACCOUNT = {
  ...ACCOUNT,
  id: "acc-legacy",
  label: "Akun lama",
  sharing_limit: 6,
  total_slots: 3,
  available_slots: 0,
  used_slots: 3,
  remaining_slots: 3,
  assigned_users: 3,
  otp_configured: false,
  account_email: null,
  otp_inbox_configured: false,
  otp_inbox_source: "none",
  mailbox_app_password_configured: false,
  imap_host: null,
  needs_review: true,
};

const SLOT = {
  id: "slot-1",
  inventory_account_id: "acc-1",
  product_price_id: "price-1",
  status: "used",
  order_id: "0192f0b0-0000-0000-0000-000000000001",
  order_number: "ORD-001",
  reserved_name: "Budi Pelanggan",
  reserved_email: "budi@example.test",
  payment_status: "paid",
  activated_at: "2026-10-01T10:00:00Z",
  access_expires_at: "2026-11-01T00:00:00Z",
  days_remaining: 10,
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
};

function mockAccounts(accounts: unknown[] = [ACCOUNT, LEGACY_ACCOUNT]) {
  listAccountsMock.mockResolvedValue({ accounts, page: 1, per_page: 100, total: accounts.length });
}

describe("Halaman Manajemen akun (NEC-98)", () => {
  beforeEach(() => {
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
    listProductsMock.mockReset().mockResolvedValue({ products: [PRODUCT], page: 1, per_page: 100, total: 1 });
    listAccountsMock.mockReset();
    mockAccounts();
    listSlotsMock.mockReset().mockResolvedValue({ slots: [SLOT], page: 1, per_page: 100, total: 1 });
    getAccountMock.mockReset().mockResolvedValue(ACCOUNT);
    createAccountMock.mockReset().mockResolvedValue({ ...ACCOUNT, id: "acc-new" });
    updateAccountMock.mockReset().mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...ACCOUNT, id, ...data }),
    );
    deleteAccountMock.mockReset().mockResolvedValue({ message: "ok" });
    generateOtpMock.mockReset().mockResolvedValue({ code: "123456", expires_in: 30, period: 30 });
    createSlotsMock.mockReset().mockResolvedValue({ created: 1, inventory_account_id: "acc-1" });
  });

  it("menampilkan produk, status, masa aktif, sharing X/5, pengguna, dan OTP", async () => {
    render(<AccountsPage />);

    await screen.findByText("Akun utama");
    const row = screen.getByText("Akun utama").closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Netflix Premium")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Aktif")).toBeInTheDocument();
    expect(row?.textContent).toContain("1/5");
    expect(row?.textContent).toContain("12 hari lagi");
    expect(row?.textContent).toContain("Siap");

    const legacyRow = screen.getByText("Akun lama").closest("tr");
    expect(legacyRow?.textContent).toContain("3/6");
    expect(within(legacyRow as HTMLElement).getByText("Perlu review")).toBeInTheDocument();
  });

  it("memuat detail akun dengan user tertaut, order, dan sisa masa akses", async () => {
    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat detail akun Akun utama" }));

    await waitFor(() => expect(getAccountMock).toHaveBeenCalledWith("acc-1"));
    expect(listSlotsMock).toHaveBeenCalledWith("acc-1", { page: 1, per_page: 100 });
    await screen.findByText("Budi Pelanggan");
    expect(screen.getByText("budi@example.test")).toBeInTheDocument();
    expect(screen.getAllByText("ORD-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10 hari lagi").length).toBeGreaterThan(0);
  });

  it("membuat akun dengan email dan kata sandi terpisah serta menolak limit di luar 1–5", async () => {
    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akun" }));
    fireEvent.change(screen.getByLabelText("Label akun"), { target: { value: "Akun baru" } });
    fireEvent.change(screen.getByLabelText("Email akun"), { target: { value: "akun-baru@necly.id" } });
    fireEvent.change(screen.getByLabelText("Kata sandi akun"), { target: { value: "kata-sandi" } });
    fireEvent.change(screen.getByLabelText("Limit sharing"), { target: { value: "6" } });
    // Submit programatis agar validasi aplikasi (bukan constraint HTML max=5) yang diuji.
    fireEvent.submit(screen.getByRole("form", { name: "Form tambah akun" }));

    expect(createAccountMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Limit sharing harus berupa angka bulat antara 1 dan 5/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Limit sharing"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun" }));

    await waitFor(() => expect(createAccountMock).toHaveBeenCalledTimes(1));
    expect(createAccountMock).toHaveBeenCalledWith({
      product_id: "prd-1",
      label: "Akun baru",
      account_email: "akun-baru@necly.id",
      account_password: "kata-sandi",
      sharing_limit: 2,
    });
    await screen.findByText(/Akun "Akun baru" dibuat/);
    expect(screen.queryByDisplayValue("kata-sandi")).not.toBeInTheDocument();
  });

  it("mengirim app password Gmail hanya bila diisi", async () => {
    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Tambah akun" }));
    fireEvent.change(screen.getByLabelText("Label akun"), { target: { value: "Akun OTP" } });
    fireEvent.change(screen.getByLabelText("Email akun"), { target: { value: "otp@necly.id" } });
    fireEvent.change(screen.getByLabelText("Kata sandi akun"), { target: { value: "sandi-akun" } });
    fireEvent.change(screen.getByLabelText("App password Gmail untuk OTP"), { target: { value: "abcd efgh ijkl mnop" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan akun" }));

    await waitFor(() => expect(createAccountMock).toHaveBeenCalledTimes(1));
    expect(createAccountMock.mock.calls[0]?.[0]).toMatchObject({
      account_email: "otp@necly.id",
      account_password: "sandi-akun",
      mailbox_app_password: "abcd efgh ijkl mnop",
    });
    expect(createAccountMock.mock.calls[0]?.[0]).not.toHaveProperty("credentials");
  });

  it("memperbarui label dan limit akun lewat PATCH", async () => {
    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Edit akun Akun utama" }));
    expect(screen.getByLabelText("Email akun")).toHaveValue("akun-utama@necly.test");
    expect(screen.getByLabelText("Kata sandi akun")).toHaveValue("");
    expect(screen.getByLabelText("App password Gmail untuk OTP")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Label akun"), { target: { value: "Akun keluarga" } });
    fireEvent.change(screen.getByLabelText("Limit sharing"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() =>
      expect(updateAccountMock).toHaveBeenCalledWith("acc-1", {
        label: "Akun keluarga",
        sharing_limit: 3,
      }),
    );
    expect(updateAccountMock.mock.calls[0]?.[1]).not.toHaveProperty("credentials");
    expect(updateAccountMock.mock.calls[0]?.[1]).not.toHaveProperty("account_password");
    expect(updateAccountMock.mock.calls[0]?.[1]).not.toHaveProperty("mailbox_app_password");
  });

  it("memperbarui email tanpa mengirim password kosong", async () => {
    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Edit akun Akun utama" }));
    fireEvent.change(screen.getByLabelText("Email akun"), { target: { value: "email-baru@necly.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() =>
      expect(updateAccountMock).toHaveBeenCalledWith("acc-1", {
        account_email: "email-baru@necly.test",
      }),
    );
  });

  it("menampilkan status OTP Gmail per akun: langsung, mailbox pusat, dan belum siap", async () => {
    mockAccounts([
      ACCOUNT,
      { ...ACCOUNT, id: "acc-central", label: "Akun pusat", otp_inbox_configured: true, otp_inbox_source: "central" },
      { ...ACCOUNT, id: "acc-none", label: "Akun tanpa OTP", otp_inbox_configured: false, otp_inbox_source: "none" },
    ]);

    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    const directRow = screen.getByText("Akun utama").closest("tr");
    expect(within(directRow as HTMLElement).getByText("Siap")).toBeInTheDocument();
    const centralRow = screen.getByText("Akun pusat").closest("tr");
    expect(within(centralRow as HTMLElement).getByText("Mailbox pusat")).toBeInTheDocument();
    const noneRow = screen.getByText("Akun tanpa OTP").closest("tr");
    expect(within(noneRow as HTMLElement).getByText("Belum siap")).toBeInTheDocument();
  });

  it("menampilkan kode OTP dan hitung mundur tanpa secret", async () => {
    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Buat OTP Akun utama" }));

    expect(await screen.findByText("123456")).toBeInTheDocument();
    expect(screen.getByText(/Berlaku 30 detik/)).toBeInTheDocument();
    expect(screen.getByText(/Secret TOTP tidak pernah dikirim ke browser/)).toBeInTheDocument();
    expect(generateOtpMock).toHaveBeenCalledWith("acc-1");
  });

  it("menampilkan error otp_not_configured dengan arahan yang jelas", async () => {
    generateOtpMock.mockRejectedValueOnce(
      new ApiError("otp belum diatur", 409, { code: "otp_not_configured" }),
    );

    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Buat OTP Akun utama" }));

    await screen.findByText(/Secret OTP belum diatur untuk akun ini/);
  });

  it("menonaktifkan tambah slot untuk akun needs_review", async () => {
    getAccountMock.mockResolvedValueOnce(LEGACY_ACCOUNT);
    listSlotsMock.mockResolvedValueOnce({ slots: [SLOT], page: 1, per_page: 100, total: 1 });

    render(<AccountsPage />);
    await screen.findByText("Akun lama");

    fireEvent.click(screen.getByRole("button", { name: "Lihat detail akun Akun lama" }));

    const addSlot = await screen.findByRole("button", { name: "Tambah slot ke Akun lama" });
    expect(addSlot).toBeDisabled();
    expect(
      screen.getByText(/penambahan slot dinonaktifkan sampai limit sharing diturunkan ke 5 atau kurang/),
    ).toBeInTheDocument();
  });

  it("menghapus akun dan menampilkan penolakan 409 tanpa menghilangkan baris", async () => {
    deleteAccountMock.mockRejectedValueOnce(
      new ApiError("akun terpakai", 409, { code: "inventory_account_in_use" }),
    );

    render(<AccountsPage />);
    await screen.findByText("Akun utama");

    fireEvent.click(screen.getByRole("button", { name: "Hapus akun Akun utama" }));
    expect(screen.getByRole("alertdialog", { name: "Konfirmasi hapus akun" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ya, hapus akun" }));

    expect(await screen.findByText(/Akun tidak dapat dihapus karena masih memiliki slot/)).toBeInTheDocument();
    expect(screen.getByText("Akun utama")).toBeInTheDocument();
    expect(deleteAccountMock).toHaveBeenCalledWith("acc-1");
  });
});
