import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetMock, search } = vi.hoisted(() => ({
  resetMock: vi.fn(),
  search: { value: "token=raw-token-123" },
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  authApi: { resetPassword: resetMock },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.value),
}));

import ResetPasswordPage from "./page";

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Kata sandi baru"), { target: { value: "N3w-strong-password!" } });
  fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), { target: { value: "N3w-strong-password!" } });
  fireEvent.click(screen.getByRole("button", { name: /simpan kata sandi baru/i }));
}

describe("halaman atur ulang kata sandi", () => {
  beforeEach(() => {
    resetMock.mockReset();
    resetMock.mockResolvedValue({ message: "Kata sandi berhasil diperbarui.", user: { id: "usr-1" } });
    search.value = "token=raw-token-123";
  });

  it("mengirim token dari URL bersama kata sandi baru", async () => {
    render(<ResetPasswordPage />);

    await fillAndSubmit();

    await waitFor(() => expect(resetMock).toHaveBeenCalledWith({ token: "raw-token-123", password: "N3w-strong-password!" }));
    expect(await screen.findByText("Kata sandi diperbarui.")).toBeInTheDocument();
  });

  it("menolak konfirmasi kata sandi yang tidak cocok tanpa menghubungi backend", () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("Kata sandi baru"), { target: { value: "N3w-strong-password!" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), { target: { value: "beda-password!" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan kata sandi baru/i }));

    expect(resetMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Konfirmasi kata sandi tidak cocok.");
  });

  it("menolak kata sandi yang terlalu pendek sebelum menghubungi backend", () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("Kata sandi baru"), { target: { value: "pendek" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), { target: { value: "pendek" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan kata sandi baru/i }));

    expect(resetMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("menampilkan pesan backend saat tautan sudah kedaluwarsa atau terpakai", async () => {
    resetMock.mockRejectedValue(new Error("Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."));
    render(<ResetPasswordPage />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("tidak valid atau sudah kedaluwarsa");
  });

  it("meminta tautan baru bila token tidak ada di URL", () => {
    search.value = "";
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("Kata sandi baru"), { target: { value: "N3w-strong-password!" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), { target: { value: "N3w-strong-password!" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan kata sandi baru/i }));

    expect(resetMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Tautan atur ulang tidak lengkap");
    expect(screen.getByRole("link", { name: "Minta tautan baru" })).toHaveAttribute("href", "/forgot-password");
  });
});
