import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyEmailMock: liveVerifyMock } = vi.hoisted(() => ({ verifyEmailMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  authApi: { verifyEmail: liveVerifyMock },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=token-dari-query"),
}));

import LiveVerifyEmailPage from "./page";

describe("halaman verifikasi email (live)", () => {
  beforeEach(() => {
    liveVerifyMock.mockReset();
    liveVerifyMock.mockResolvedValue({ message: "Verified" });
  });

  it("memverifikasi token melalui API live saat mode demo dinonaktifkan", async () => {
    render(<LiveVerifyEmailPage />);

    fireEvent.click(screen.getByRole("button", { name: "Verifikasi sekarang" }));

    await waitFor(() => expect(liveVerifyMock).toHaveBeenCalledWith("token-dari-query"));
    expect(screen.getByText("Email terverifikasi. Silakan masuk.")).toBeInTheDocument();
  });
});