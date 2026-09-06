import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginMock, pushMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  authApi: { login: loginMock },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("redirect=%2Fcheckout"),
}));

import LoginPage from "./page";

describe("halaman login", () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
    loginMock.mockResolvedValue({ user: { id: "usr-1" }, access_token: "token" });
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
