import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSearchableOption } from "@/test/searchable-select";

const { listUsersMock, updateUserMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  updateUserMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: {
      ...actual.adminApi,
      listUsers: listUsersMock,
      updateUser: updateUserMock,
    },
  };
});

import CustomersPage from "./page";
import { ApiError } from "@/lib/api";

type TestUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "seller" | "admin";
  active: boolean;
  email_verified_at: string;
  created_at: string;
};

const USERS: TestUser[] = [
  { id: "admin-1", name: "Admin Saya", email: "self@example.test", role: "admin", active: true, email_verified_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "admin-2", name: "Admin Kedua", email: "admin2@example.test", role: "admin", active: true, email_verified_at: "2026-01-02T00:00:00Z", created_at: "2026-01-02T00:00:00Z" },
  { id: "cust-1", name: "Budi Pelanggan", email: "budi@example.test", role: "customer", active: true, email_verified_at: "2026-01-03T00:00:00Z", created_at: "2026-01-03T00:00:00Z" },
  { id: "seller-1", name: "Sari Penjual", email: "sari@example.test", role: "seller", active: true, email_verified_at: "2026-01-04T00:00:00Z", created_at: "2026-01-04T00:00:00Z" },
];

function mockList(users: TestUser[], activeAdminTotal = users.filter((user) => user.role === "admin" && user.active).length) {
  listUsersMock.mockImplementation((params?: { role?: string; active?: boolean }) => {
    if (params?.role === "admin" && params.active === true) {
      const admins = users.filter((user) => user.role === "admin" && user.active);
      return Promise.resolve({ users: admins, page: 1, per_page: 100, total: activeAdminTotal });
    }
    return Promise.resolve({ users, page: 1, per_page: 100, total: users.length });
  });
}

describe("manajemen akses pengguna di /dashboard/customers", () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    updateUserMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    mockList(USERS);
    updateUserMock.mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...USERS.find((user) => user.id === id), ...data }),
    );
  });

  it("menampilkan role/status dari API dan menyembunyikan aksi untuk akun sendiri", async () => {
    render(<CustomersPage />);

    await screen.findByText("Budi Pelanggan");

    const selfRow = screen.getByText("Admin Saya").closest("tr");
    expect(selfRow).not.toBeNull();
    expect(within(selfRow as HTMLElement).getByText("Akun Anda")).toBeInTheDocument();
    expect(within(selfRow as HTMLElement).queryByRole("button", { name: /Kelola akses/ })).not.toBeInTheDocument();

    // Admin lain dan non-admin dapat dikelola.
    expect(screen.getByRole("button", { name: "Kelola akses Admin Kedua" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kelola akses Budi Pelanggan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kelola akses Sari Penjual" })).toBeInTheDocument();

    const customerRow = screen.getByText("Budi Pelanggan").closest("tr");
    expect(within(customerRow as HTMLElement).getByText("Pelanggan")).toBeInTheDocument();
    expect(within(customerRow as HTMLElement).getByText("Aktif")).toBeInTheDocument();

    // Satu request daftar, satu request hitungan admin aktif.
    expect(listUsersMock).toHaveBeenCalledWith({ page: 1, per_page: 100 });
    expect(listUsersMock).toHaveBeenCalledWith({ page: 1, per_page: 100, role: "admin", active: true });
  });

  it("menyembunyikan aksi untuk admin aktif terakhir yang bukan akun sendiri", async () => {
    // Sesi admin yang terdaftar, tetapi baris admin target adalah satu-satunya
    // admin aktif pada data yang dimuat; guard UI harus menyembunyikan aksi.
    bootstrapAuthMock.mockResolvedValue({ id: "viewer-lain", role: "admin" });
    mockList([USERS[1]], 1);

    render(<CustomersPage />);

    await screen.findByText("Admin Kedua");
    const row = screen.getByText("Admin Kedua").closest("tr");
    expect(within(row as HTMLElement).getByText("Admin aktif terakhir")).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByRole("button", { name: /Kelola akses/ })).not.toBeInTheDocument();
  });

  it("meminta konfirmasi sebelum mengubah role lalu memuat ulang daftar", async () => {
    render(<CustomersPage />);
    await screen.findByText("Budi Pelanggan");
    const initialListCalls = listUsersMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Kelola akses Budi Pelanggan" }));
    chooseSearchableOption("Peran", "Admin");

    // Klik pertama hanya menampilkan ringkasan konfirmasi.
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Konfirmasi: Anda akan mengubah peran dari Pelanggan menjadi Admin/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith("cust-1", { role: "admin" }));
    await screen.findByText(/Akses Budi Pelanggan diperbarui: peran Admin/);
    await waitFor(() => expect(listUsersMock.mock.calls.length).toBeGreaterThan(initialListCalls));
  });

  it("menonaktifkan akun dengan konfirmasi dan payload active=false", async () => {
    render(<CustomersPage />);
    await screen.findByText("Sari Penjual");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akses Sari Penjual" }));
    chooseSearchableOption("Status akun", "Nonaktif");
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    expect(screen.getByText(/Konfirmasi: Anda akan mengubah menonaktifkan akun/)).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith("seller-1", { active: false }));
    await screen.findByText(/Akses Sari Penjual diperbarui: peran Penjual, status Nonaktif/);
  });

  it("menampilkan pesan backend 409 last_admin tanpa menutup form", async () => {
    updateUserMock.mockRejectedValueOnce(
      new ApiError("Tidak dapat menghapus admin aktif terakhir", 409, {
        error: "Tidak dapat menghapus admin aktif terakhir",
        code: "last_admin",
      }),
    );

    render(<CustomersPage />);
    await screen.findByText("Admin Kedua");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akses Admin Kedua" }));
    chooseSearchableOption("Peran", "Pelanggan");
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith("admin-2", { role: "customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tidak dapat menghapus admin aktif terakhir");
    expect(screen.getByRole("heading", { name: "Kelola akses — Admin Kedua" })).toBeInTheDocument();
  });

  it("menampilkan pesan backend 403 secara apa adanya", async () => {
    updateUserMock.mockRejectedValueOnce(
      new ApiError("Tidak dapat menonaktifkan akun sendiri", 403, {
        error: "Tidak dapat menonaktifkan akun sendiri",
        code: "forbidden",
      }),
    );

    render(<CustomersPage />);
    await screen.findByText("Budi Pelanggan");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akses Budi Pelanggan" }));
    chooseSearchableOption("Status akun", "Nonaktif");
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Tidak dapat menonaktifkan akun sendiri");
  });

  it("menampilkan pesan backend 401 secara apa adanya", async () => {
    updateUserMock.mockRejectedValueOnce(
      new ApiError("Sesi tidak valid atau telah berakhir, silakan masuk kembali", 401, {
        error: "Sesi tidak valid atau telah berakhir, silakan masuk kembali",
        code: "unauthorized",
      }),
    );

    render(<CustomersPage />);
    await screen.findByText("Budi Pelanggan");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akses Budi Pelanggan" }));
    chooseSearchableOption("Peran", "Admin");
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sesi tidak valid atau telah berakhir, silakan masuk kembali");
  });

  it("menampilkan pesan backend 404 secara apa adanya", async () => {
    // Pesan backend sengaja berbeda dari teks cadangan ("Pengguna tidak
    // ditemukan. Muat ulang daftar pengguna.") supaya tes benar-benar gagal
    // bila suatu saat kembali memakai teks tetap — temuan P3 review NEC-59.
    updateUserMock.mockRejectedValueOnce(
      new ApiError("Akun sudah dihapus permanen", 404, {
        error: "Akun sudah dihapus permanen",
        code: "not_found",
      }),
    );

    render(<CustomersPage />);
    await screen.findByText("Budi Pelanggan");

    fireEvent.click(screen.getByRole("button", { name: "Kelola akses Budi Pelanggan" }));
    chooseSearchableOption("Status akun", "Nonaktif");
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya, terapkan perubahan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Akun sudah dihapus permanen");
  });

  it("menyaring daftar berdasarkan peran dan pencarian tanpa mengirim ulang perubahan", async () => {
    render(<CustomersPage />);
    await screen.findByText("Budi Pelanggan");

    chooseSearchableOption("Filter peran", "Admin");
    expect(screen.getByText("Admin Saya")).toBeInTheDocument();
    expect(screen.queryByText("Budi Pelanggan")).not.toBeInTheDocument();

    chooseSearchableOption("Filter peran", "Semua peran");
    fireEvent.change(screen.getByPlaceholderText("Cari nama atau email pengguna…"), { target: { value: "sari" } });
    expect(screen.getByText("Sari Penjual")).toBeInTheDocument();
    expect(screen.queryByText("Admin Saya")).not.toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });
});
