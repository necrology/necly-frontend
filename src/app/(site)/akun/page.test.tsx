import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { bootstrapMock, listSessionsMock, replaceMock, changePasswordMock, logoutMock } = vi.hoisted(() => ({
  bootstrapMock: vi.fn(),
  listSessionsMock: vi.fn(),
  replaceMock: vi.fn(),
  changePasswordMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    bootstrapAuth: bootstrapMock,
    authApi: {
      ...actual.authApi,
      listSessions: listSessionsMock,
      changePassword: changePasswordMock,
      revokeSession: vi.fn(),
      revokeOtherSessions: vi.fn(),
      logout: logoutMock,
    },
  };
});

import AccountPage from "./page";

const user = {
  id: "u-1",
  email: "budi@example.id",
  name: "Budi Santoso",
  role: "customer" as const,
  emailVerifiedAt: "2026-10-14T00:00:00Z",
  createdAt: "",
  updatedAt: "",
};

describe("halaman akun", () => {
  beforeEach(() => {
    bootstrapMock.mockReset();
    listSessionsMock.mockReset();
    replaceMock.mockReset();
    changePasswordMock.mockReset();
    logoutMock.mockReset();
    listSessionsMock.mockResolvedValue({ sessions: [] });
    changePasswordMock.mockResolvedValue({ message: "Kata sandi berhasil diubah. Sesi lain sudah diakhiri." });
    logoutMock.mockResolvedValue({ message: "Berhasil keluar" });
  });

  it("mengalihkan pengunjung yang belum masuk ke halaman login", async () => {
    bootstrapMock.mockResolvedValue(null);

    render(<AccountPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fakun"));
    expect(listSessionsMock).not.toHaveBeenCalled();
  });

  it("menampilkan profil dan menandai perangkat yang sedang dipakai", async () => {
    bootstrapMock.mockResolvedValue(user);
    listSessionsMock.mockResolvedValue({
      sessions: [
        {
          id: "s-1",
          user_agent: "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36",
          ip_address: "10.0.0.1",
          created_at: "2026-10-14T01:00:00Z",
          expires_at: "2026-10-21T01:00:00Z",
          current: true,
        },
        {
          id: "s-2",
          user_agent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36",
          ip_address: "10.0.0.2",
          created_at: "2026-10-13T01:00:00Z",
          expires_at: "2026-10-20T01:00:00Z",
          current: false,
        },
      ],
    });

    render(<AccountPage />);

    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("budi@example.id")).toBeInTheDocument();
    expect(screen.getByText("Terverifikasi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pesanan saya" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("heading", { name: "Bantuan masuk dengan Google" })).toBeInTheDocument();
    expect(screen.getByText(/akun Google yang sedang aktif di browser ini/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lupa kata sandi?" })).toHaveAttribute("href", "/forgot-password");

    // Perangkat yang sedang dipakai ditandai, dan tidak bisa diakhiri dari sini.
    expect(screen.getByText("Perangkat ini")).toBeInTheDocument();
    expect(screen.getByText(/Chrome di Android/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akhiri" })).toBeInTheDocument();
    // Hanya sesi lain yang menawarkan tombol akhiri.
    expect(screen.getAllByRole("button", { name: "Akhiri" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Akhiri 1 sesi lain/ })).toBeInTheDocument();
  });

  it("menampilkan galat ketika daftar sesi tidak dapat dimuat", async () => {
    bootstrapMock.mockResolvedValue(user);
    const { ApiError } = await import("@/lib/api");
    listSessionsMock.mockRejectedValue(new ApiError("Gagal mengambil daftar sesi", 500, null));

    render(<AccountPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal mengambil daftar sesi");
  });

  it("menyediakan tautan Lupa sandi saat ini? di card ubah kata sandi (baris 76)", async () => {
    bootstrapMock.mockResolvedValue(user);

    render(<AccountPage />);

    const link = await screen.findByRole("link", { name: "Lupa sandi saat ini?" });
    expect(link).toHaveAttribute("href", "/forgot-password");
    // Tautan berada di card Ubah kata sandi, dekat field kata sandi saat ini.
    expect(link.closest("article")).toHaveTextContent("Ubah kata sandi");
  });

  it("menampilkan info sukses lalu memaksa logout ke Log In (baris 77)", async () => {
    bootstrapMock.mockResolvedValue(user);

    render(<AccountPage />);

    await screen.findByText("Budi Santoso");
    fireEvent.change(screen.getByLabelText(/Kata sandi saat ini/), { target: { value: "NurAuliaSoraya030307!!?#" } });
    fireEvent.change(screen.getByLabelText(/Kata sandi baru/), { target: { value: "NurAuliaSoraya030307!!?##" } });
    fireEvent.change(screen.getByLabelText(/Konfirmasi kata sandi baru/), { target: { value: "NurAuliaSoraya030307!!?##" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan kata sandi baru/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Perubahan kata sandi berhasil. Sesi lain sudah berakhir",
    );
    expect(changePasswordMock).toHaveBeenCalledWith({
      current_password: "NurAuliaSoraya030307!!?#",
      new_password: "NurAuliaSoraya030307!!?##",
    });

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?passwordChanged=1"), { timeout: 5000 });
    expect(logoutMock).toHaveBeenCalled();
  });
});
