import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginMock, pushMock, replaceMock, bootstrapMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  bootstrapMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  bootstrapAuth: bootstrapMock,
  // authProviders stays false so the Google button renders nothing here; the
  // component itself is covered separately.
  authApi: { login: loginMock, authProviders: () => Promise.resolve({ password: true, google: false }) },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams("redirect=%2Fcheckout"),
}));

import LoginPage from "./page";

describe("halaman login", () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
    bootstrapMock.mockReset();
    // No session by default, so the form is the thing under test.
    bootstrapMock.mockResolvedValue(null);
    loginMock.mockResolvedValue({ user: { id: "usr-1" }, access_token: "token" });
  });

  // Sebelumnya halaman ini selalu menampilkan formulir, jadi setiap tautan yang
  // mengarah ke /login terasa seperti dipaksa keluar lagi.
  it("mengalihkan pengunjung yang sesinya masih berlaku tanpa menampilkan formulir", async () => {
    bootstrapMock.mockResolvedValue({ id: "usr-1", name: "Budi", role: "customer" });

    render(<LoginPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/checkout"));
  });

  it("masuk melalui API live lalu membuka tujuan redirect yang aman", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Alamat email"), {
      target: { value: "pelanggan@example.id" },
    });
    fireEvent.change(screen.getByLabelText("Kata sandi"), {
      target: { value: "rahasia-aman" },
    });
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "pelanggan@example.id",
        password: "rahasia-aman",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/checkout");
  });
});
