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
    forgotMock.mockResolvedValue({ message: "Jika email tersebut terdaftar, tautan atur ulang kata sandi sudah dikirim." });
  });

  it("meminta tautan atur ulang lalu menampilkan pesan yang tidak membocorkan keberadaan akun", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "pelanggan@example.id" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim tautan atur ulang/i }));

    await waitFor(() => expect(forgotMock).toHaveBeenCalledWith("pelanggan@example.id"));
    // The copy must stay conditional ("jika ... terdaftar"), never confirm that
    // the account exists.
    expect(await screen.findByText(/terdaftar, kami sudah mengirim tautan atur ulang/i)).toBeInTheDocument();
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
