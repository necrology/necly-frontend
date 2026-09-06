import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, useAuthStore } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  it("mengirim cookie refresh dan mengulang satu kali setelah 401", async () => {
    useAuthStore.getState().setAuth(
      {
        id: "usr-1",
        email: "pelanggan@example.id",
        name: "Pelanggan Necly",
        role: "customer",
        emailVerifiedAt: "2026-09-06T00:00:00Z",
        createdAt: "2026-09-06T00:00:00Z",
        updatedAt: "2026-09-06T00:00:00Z",
      },
      "token-lama",
    );

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "invalid or expired token" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: "usr-1",
            email: "pelanggan@example.id",
            name: "Pelanggan Necly",
            role: "customer",
            email_verified_at: "2026-09-06T00:00:00Z",
            created_at: "2026-09-06T00:00:00Z",
            updated_at: "2026-09-06T00:00:00Z",
          },
          access_token: "token-baru",
          expires_in: 900,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ items: unknown[]; total: number }>("/cart")).resolves.toEqual({ items: [], total: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer token-lama");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/auth/refresh");
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("Authorization")).toBe("Bearer token-baru");
  });
});
