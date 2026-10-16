import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { providersMock } = vi.hoisted(() => ({ providersMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  authApi: {
    authProviders: providersMock,
    googleLoginUrl: "https://api.example.test/api/v1/auth/google",
  },
}));

import { GoogleSignInButton } from "./google-sign-in";

describe("tombol masuk dengan Google", () => {
  beforeEach(() => {
    providersMock.mockReset();
  });

  // A button that leads to a Google error page is worse than no button, so an
  // unconfigured deployment must render nothing at all.
  it("tidak menampilkan apa pun ketika backend melaporkan Google nonaktif", async () => {
    providersMock.mockResolvedValue({ password: true, google: false });

    const { container } = render(<GoogleSignInButton label="Masuk dengan Google" />);

    await waitFor(() => expect(providersMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("menampilkan tautan ke endpoint Google ketika aktif", async () => {
    providersMock.mockResolvedValue({ password: true, google: true });

    render(<GoogleSignInButton label="Masuk dengan Google" />);

    const link = await screen.findByRole("link", { name: /Masuk dengan Google/ });
    expect(link).toHaveAttribute("href", "https://api.example.test/api/v1/auth/google");
    expect(screen.getByText("atau")).toBeInTheDocument();
  });

  // The check runs over the network; a failure must degrade to "no button".
  it("tetap tidak menampilkan apa pun ketika pemeriksaan gagal", async () => {
    providersMock.mockRejectedValue(new Error("offline"));

    const { container } = render(<GoogleSignInButton label="Masuk dengan Google" />);

    await waitFor(() => expect(providersMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
