import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore, type User } from "./api";

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
});
