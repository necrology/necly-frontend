import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerMock } = vi.hoisted(() => ({ registerMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  authApi: { register: registerMock, authProviders: () => Promise.resolve({ password: true, google: false }) },
}));

import RegisterPage from "./page";

describe("halaman pendaftaran", () => {
  beforeEach(() => {
    registerMock.mockReset();
    registerMock.mockResolvedValue({ user: { id: "usr-1" } });
  });

  // Baris 69: email yang sudah terdaftar harus mendapat pesan tegas, bukan pesan
  // gabungan "mungkin sudah digunakan atau data belum valid".
  it("memberi pesan tegas ketika email sudah terdaftar (baris 69)", async () => {
    registerMock.mockRejectedValue(Object.assign(new Error("conflict"), { status: 409 }));
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Soraya" } });
    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "soraya@example.com" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "NurAuliaSoraya!!?#" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi"), { target: { value: "NurAuliaSoraya!!?#" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    await waitFor(() => expect(screen.getByText(/terdata sudah terdaftar/i)).toBeTruthy());
    expect(screen.queryByText(/mungkin sudah digunakan atau data belum valid/i)).toBeNull();
  });

  // Baris 69: email dengan format tidak valid harus memakai kalimat yang diminta QA.
  it("memberi pesan email tidak valid (baris 69)", async () => {
    registerMock.mockRejectedValue(Object.assign(new Error("invalid"), { status: 422 }));
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Soraya" } });
    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "soraya@example.com" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "NurAuliaSoraya!!?#" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi"), { target: { value: "NurAuliaSoraya!!?#" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    await waitFor(() => expect(screen.getByText(/Email tidak valid, silahkan input dengan email yang valid/i)).toBeTruthy());
  });

  it("mendaftarkan akun melalui API live dan menampilkan langkah verifikasi", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Nabila Rahma" } });
    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "nabila@example.id" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "rahasia-aman" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi"), { target: { value: "rahasia-aman" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    await waitFor(() => expect(registerMock).toHaveBeenCalledWith({
      name: "Nabila Rahma",
      email: "nabila@example.id",
      password: "rahasia-aman",
    }));
    expect(await screen.findByRole("heading", { name: "Periksa email Anda." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lanjut ke verifikasi/i })).toHaveAttribute(
      "href",
      "/verify-email?email=nabila%40example.id",
    );
  });

  it("menolak kata sandi yang lebih dari 72 byte sebelum memanggil API", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Nabila Rahma" } });
    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "nabila@example.id" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: `${"😀".repeat(18)}a` } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi"), { target: { value: `${"😀".repeat(18)}a` } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    expect(screen.getByText("Kata sandi terlalu panjang. Gunakan maksimal 72 karakter.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });
});
