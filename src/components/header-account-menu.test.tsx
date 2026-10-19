import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { useAuthStore } from "@/lib/api";
import { HeaderAccountMenu } from "./header-account-menu";

const user = {
  id: "usr-1",
  email: "budi@example.id",
  name: "Budi Santoso",
  role: "customer" as const,
  emailVerifiedAt: "2026-10-14T00:00:00Z",
  createdAt: "",
  updatedAt: "",
};

describe("menu akun header", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user,
      accessToken: "token",
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("menyediakan tautan Pesanan saya yang bisa dijangkau dari menu akun", () => {
    render(<HeaderAccountMenu variant="pill" />);

    fireEvent.click(screen.getByRole("button", { name: "Budi" }));

    expect(screen.getByRole("menuitem", { name: "Pesanan saya" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("menuitem", { name: "Profil" })).toHaveAttribute("href", "/akun");
  });

  it("menutup menu setelah tautan Pesanan saya dipilih", () => {
    render(<HeaderAccountMenu variant="icon" />);

    fireEvent.click(screen.getByRole("button", { name: /Menu akun Budi Santoso/ }));
    const link = screen.getByRole("menuitem", { name: "Pesanan saya" });
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
