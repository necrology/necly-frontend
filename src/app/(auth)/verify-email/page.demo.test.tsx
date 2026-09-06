import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyEmailMock: demoVerifyMock } = vi.hoisted(() => ({ verifyEmailMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: true,
  authApi: { verifyEmail: demoVerifyMock },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=demo-token"),
}));

import DemoVerifyEmailPage from "./page";

describe("halaman verifikasi email (demo)", () => {
  beforeEach(() => {
    demoVerifyMock.mockReset();
  });

  it("menampilkan mode demo tanpa memanggil API", async () => {
    render(<DemoVerifyEmailPage />);

    fireEvent.click(screen.getByRole("button", { name: "Simulasikan verifikasi" }));
    expect(screen.getByText(/mode demo/i)).toBeInTheDocument();
    expect(demoVerifyMock).not.toHaveBeenCalled();
  });
});