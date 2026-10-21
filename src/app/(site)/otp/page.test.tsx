import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("mengisi form dari tautan pesanan lalu menampilkan OTP", async () => {
    lookupMock.mockResolvedValue({ otp: "482913", received_at: "2026-10-21T10:00:00Z" });
    render(<AccountOtpPage />);

    expect(screen.getByLabelText(/Email akun/)).toHaveValue("family@example.test");
    expect(screen.getByLabelText(/Kode akses/)).toHaveValue("ABCD234567");

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
