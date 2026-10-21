// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("meneruskan token dan kata sandi baru ke endpoint backend", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ message: "Kata sandi berhasil diperbarui.", user: { id: "usr-1" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ token: "raw-token-123", password: "N3w-strong-password!" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Kata sandi berhasil diperbarui.",
      user: { id: "usr-1" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "raw-token-123", password: "N3w-strong-password!" }),
        cache: "no-store",
      }),
    );
  });

  it("mengutamakan INTERNAL_API_URL untuk panggilan dari dalam jaringan deployment", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://validation.localhost:58443/api/v1");
    vi.stubEnv("INTERNAL_API_URL", "http://api:8080/api/v1");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ message: "Kata sandi berhasil diperbarui." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ token: "raw-token-123", password: "N3w-strong-password!" }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api:8080/api/v1/auth/reset-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("menolak token kosong tanpa menghubungi backend", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ token: "  ", password: "N3w-strong-password!" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Tautan atur ulang tidak lengkap. Minta tautan baru dari halaman lupa kata sandi.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak kata sandi di luar rentang 10-72 karakter tanpa menghubungi backend", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const tooShort = await POST(request({ token: "raw-token-123", password: "pendek" }));
    const tooLong = await POST(request({ token: "raw-token-123", password: "x".repeat(73) }));

    expect(tooShort.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(await tooShort.json()).toEqual({ error: "Kata sandi baru harus 10-72 karakter." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("meneruskan status tautan kedaluwarsa dari backend", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ error: "Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )));

    const response = await POST(request({ token: "expired", password: "N3w-strong-password!" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.",
    });
  });

  it("mengubah kegagalan jaringan backend menjadi respons 502", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Load failed")));

    const response = await POST(request({ token: "raw-token-123", password: "N3w-strong-password!" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Layanan atur ulang kata sandi sedang tidak tersedia.",
    });
  });
});
