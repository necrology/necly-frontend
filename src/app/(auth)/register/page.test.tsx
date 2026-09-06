import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerMock } = vi.hoisted(() => ({ registerMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  authApi: { register: registerMock },
}));

import RegisterPage from "./page";

describe("halaman pendaftaran", () => {
  beforeEach(() => {
    registerMock.mockReset();
    registerMock.mockResolvedValue({ user: { id: "usr-1" } });
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

    expect(screen.getByText("Kata sandi harus terdiri dari 10–72 byte.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });
});
