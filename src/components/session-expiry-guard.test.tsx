import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathname, replaceMock, logoutMock } = vi.hoisted(() => ({
  pathname: { value: "/akun" },
  replaceMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    authApi: { ...actual.authApi, logout: logoutMock },
  };
});

import { SESSION_EXPIRED_EVENT, useAuthStore } from "@/lib/api";
import { SessionExpiryGuard } from "./session-expiry-guard";

describe("penjaga sesi kedaluwarsa", () => {
  beforeEach(() => {
    pathname.value = "/akun";
    replaceMock.mockReset();
    logoutMock.mockReset();
    logoutMock.mockResolvedValue({ message: "Berhasil keluar" });
    useAuthStore.getState().clearAuth();
  });

  it("langsung logout dan ke Log In saat sesi kedaluwarsa lalu berpindah halaman (baris 80)", async () => {
    useAuthStore.setState({ accessToken: "token-lama", expiresAt: Date.now() + 60_000, isAuthenticated: true });
    const view = render(<SessionExpiryGuard />);

    expect(replaceMock).not.toHaveBeenCalled();

    // Jam perangkat dimajukan melewati masa sesi, lalu pengguna berpindah
    // halaman SPA tanpa me-refresh browser.
    pathname.value = "/orders";
    await act(async () => {
      useAuthStore.setState({ expiresAt: Date.now() - 1_000 });
      view.rerender(<SessionExpiryGuard />);
    });

    expect(logoutMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/login?expired=1");
  });

  it("tetap redirect ketika 401 sudah membersihkan state autentikasi (baris 80)", async () => {
    useAuthStore.setState({ accessToken: "token-lama", expiresAt: Date.now() + 60_000, isAuthenticated: true });
    render(<SessionExpiryGuard />);

    await act(async () => {
      useAuthStore.setState({ accessToken: null, expiresAt: null, isAuthenticated: false });
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(replaceMock).toHaveBeenCalledWith("/login?expired=1");
  });

  it("tidak membuat loop redirect saat sudah berada di halaman Log In (baris 80)", () => {
    pathname.value = "/login";
    useAuthStore.setState({ accessToken: "token-lama", expiresAt: Date.now() - 1_000, isAuthenticated: true });

    render(<SessionExpiryGuard />);

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
