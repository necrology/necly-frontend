import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock } = vi.hoisted(() => ({ getOrderMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: true,
  checkoutApi: { getOrder: getOrderMock },
}));

import { PaymentClient } from "./payment-client";

describe("halaman pembayaran (demo)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
  });

  it("tidak memanggil checkoutApi.getOrder saat DEMO_MODE=true", async () => {
    render(<PaymentClient orderId="ord-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Simulasikan persetujuan/i }));

    await waitFor(() => expect(getOrderMock).not.toHaveBeenCalled());
    expect(screen.getByText("Diarahkan ke pembayaran")).toBeInTheDocument();
  });
});