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

  it("menampilkan galat ketika permintaan gagal dikirim", async () => {
    forgotMock.mockRejectedValue(new Error("network down"));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "pelanggan@example.id" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim tautan atur ulang/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Permintaan gagal dikirim");
  });
});
