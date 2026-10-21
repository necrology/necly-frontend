import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapAuth, isSessionExpired, sessionExpiryFrom, useAuthStore, type User } from "./api";

const user: User = {
  id: "usr-1",
  email: "pelanggan@example.id",
  name: "Pelanggan Necly",
  role: "customer",
  emailVerifiedAt: "2026-09-06T00:00:00Z",
  createdAt: "2026-09-06T00:00:00Z",
  updatedAt: "2026-09-06T00:00:00Z",
};

describe("penyimpanan sesi autentikasi", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
  });

  it("menyimpan access token hanya di memori", () => {
    useAuthStore.getState().setAuth(user, "access-token-rahasia");

    expect(useAuthStore.getState().accessToken).toBe("access-token-rahasia");
    expect(JSON.stringify(localStorage)).not.toContain("access-token-rahasia");
    expect(localStorage.getItem("necly-auth")).toBeNull();
  });

  it("menyimpan masa berlaku sesi tanpa menyimpan token", () => {
    useAuthStore.getState().setAuth(user, "access-token-rahasia", 3600);
    const expiresAt = useAuthStore.getState().expiresAt;

    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(localStorage.getItem("necly-auth-expires-at")).toBe(String(expiresAt));
    expect(JSON.stringify(localStorage)).not.toContain("access-token-rahasia");
  });

  it("mendeteksi sesi yang sudah kedaluwarsa", () => {
    expect(isSessionExpired(Date.now() - 1000)).toBe(true);
    expect(isSessionExpired(Date.now() + 60_000)).toBe(false);
    expect(sessionExpiryFrom("token", 60)).toBeGreaterThan(Date.now());
  });

  it("tidak memulihkan sesi kedaluwarsa dan mengakhiri sesi server", async () => {
    const expired = Date.now() - 1000;
    useAuthStore.setState({ user: null, accessToken: null, expiresAt: expired, isAuthenticated: false });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(bootstrapAuth()).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalled();
      expect(localStorage.getItem("necly-auth-expires-at")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
