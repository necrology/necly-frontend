import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookupMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    readonly status: number;
    readonly payload: unknown;
    constructor(message: string, status: number, payload: unknown = {}) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.payload = payload;
    }
  }
  return { lookupMock: vi.fn(), ApiErrorMock };
});

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  ApiError: ApiErrorMock,
  accountOtpApi: { lookup: lookupMock },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("email=family%40example.test&code=abcd234567"),
}));

import AccountOtpPage from "./page";

describe("halaman ambil OTP akun", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("menampilkan form paling awal dengan copy baru lalu menampilkan OTP", async () => {
    lookupMock.mockResolvedValue({ otp: "482913", received_at: "2026-10-21T10:00:00Z" });
    render(<AccountOtpPage />);

    const formHeading = screen.getByRole("heading", { name: "Email akun & kode akses" });
    expect(screen.getByText("Masukkan kode akses yang Anda dapatkan sebelumnya untuk mendapatkan akses penuh aplikasi.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Alur pengambilan OTP" })).not.toBeInTheDocument();
    expect(formHeading.compareDocumentPosition(screen.getByRole("heading", { name: "Belum punya kode akses?" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Video tutorial segera hadir" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email akun/)).toHaveValue("family@example.test");
    expect(screen.getByLabelText(/Kode akses/)).toHaveValue("ABCD234567");

    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain(".otp-title { font-size: clamp(1.45rem, 3.2vw, 1.75rem);");
    expect(css).toContain(".otp-lede { font-size: clamp(.92rem, 2vw, 1rem) !important;");

    fireEvent.click(screen.getByRole("button", { name: "Ambil kode OTP" }));

    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith("family@example.test", "ABCD234567"));
    expect(await screen.findByText("482913")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salin kode OTP/ })).toBeInTheDocument();
  });

  it("menolak input yang belum lengkap tanpa memanggil backend", async () => {
    render(<AccountOtpPage />);
    fireEvent.change(screen.getByLabelText(/Kode akses/), { target: { value: "ABC" } });
    fireEvent.click(screen.getByRole("button", { name: "Ambil kode OTP" }));

    expect(await screen.findByText("Masukkan kode akses yang lengkap.")).toBeInTheDocument();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("menjelaskan kode akses yang tidak cocok dengan pesan yang aman", async () => {
    lookupMock.mockRejectedValue(new ApiErrorMock("Email atau kode akses tidak cocok", 404, { code: "otp_access_invalid" }));
    render(<AccountOtpPage />);

    fireEvent.click(screen.getByRole("button", { name: "Ambil kode OTP" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email atau kode akses tidak cocok");
  });
});
