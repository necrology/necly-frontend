import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { forgotMock, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { forgotMock: vi.fn(), MockApiError };
});

vi.mock("@/lib/api", () => ({
  ApiError: MockApiError,
  DEMO_MODE: false,
  authApi: { forgotPassword: forgotMock },
}));

import ForgotPasswordPage from "./page";

describe("halaman lupa kata sandi", () => {
  beforeEach(() => {
    forgotMock.mockReset();
    forgotMock.mockResolvedValue({ message: "Tautan atur ulang kata sandi sudah dikirim." });
  });

  it("meminta tautan atur ulang lalu menampilkan alamat tujuan", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "pelanggan@example.id" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim tautan atur ulang/i }));

    await waitFor(() => expect(forgotMock).toHaveBeenCalledWith("pelanggan@example.id"));
    expect(await screen.findByText(/kami sudah mengirim tautan atur ulang/i)).toBeInTheDocument();
    expect(screen.getByText("pelanggan@example.id")).toBeInTheDocument();
  });

  it("memberi tahu email belum terdaftar dan mengarahkan pembuatan akun", async () => {
    forgotMock.mockRejectedValue(new MockApiError("Email belum terdaftar.", 404));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "baru@example.id" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim tautan atur ulang/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email belum terdaftar");
    expect(screen.getByRole("link", { name: "Buat akun sekarang" })).toHaveAttribute("href", "/register");
  });

  it("menolak alamat email yang tidak valid tanpa menghubungi backend", () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "bukan-email" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim tautan atur ulang/i }));

    expect(forgotMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Masukkan alamat email yang valid.");
  });

  // Baris 70: judul konfirmasi harus berbunyi "berhasil terkirim" dengan ikon
  // sukses, paragraf spam berwarna merah, dan tautan balik berbunyi "Kembali Log In".
  it("memakai copy konfirmasi baris 70 dan tidak lagi menulis Kembali ke masuk", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/alamat email/i), { target: { value: "soraya@example.com" } });
    fireEvent.submit(screen.getByRole("button", { name: /kirim tautan/i }));

    await waitFor(() => expect(forgotMock).toHaveBeenCalled());

    expect(await screen.findByText(/tautan atur ulang berhasil terkirim/i)).toBeTruthy();

    const spam = screen.getByText(/tidak menerima email\?/i);
    expect(spam.className).toContain("auth-reset-spam");

    const back = screen.getAllByRole("link", { name: /kembali log in/i });
    expect(back.length).toBeGreaterThan(0);
    expect(screen.queryByText(/kembali ke masuk/i)).toBeNull();
  });

  it("menampilkan galat ketika permintaan gagal dikirim", async () => {
    forgotMock.mockRejectedValue(new Error("network down"));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "pelanggan@example.id" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim tautan atur ulang/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Permintaan gagal dikirim");
  });
});
