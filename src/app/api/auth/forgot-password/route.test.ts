// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("meneruskan permintaan valid ke endpoint backend", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ message: "Jika terdaftar, tautan sudah dikirim." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ email: " pelanggan@example.id " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Jika terdaftar, tautan sudah dikirim." });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "pelanggan@example.id" }),
        cache: "no-store",
      }),
    );
  });

  it("mengutamakan INTERNAL_API_URL untuk panggilan dari dalam jaringan deployment", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://validation.localhost:58443/api/v1");
    vi.stubEnv("INTERNAL_API_URL", "http://api:8080/api/v1");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ message: "Jika terdaftar, tautan sudah dikirim." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ email: "pelanggan@example.id" }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api:8080/api/v1/auth/forgot-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("menolak email tidak valid tanpa menghubungi backend", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ email: "bukan-email" }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("meneruskan status email belum terdaftar dari backend", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ error: "Email belum terdaftar. Silakan membuat akun terlebih dahulu." }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    )));

    const response = await POST(request({ email: "baru@example.id" }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Email belum terdaftar. Silakan membuat akun terlebih dahulu.",
    });
  });

  it("mengubah kegagalan jaringan backend menjadi respons 502", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network down")));

    const response = await POST(request({ email: "pelanggan@example.id" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Layanan atur ulang kata sandi sedang tidak tersedia.",
    });
  });
});
