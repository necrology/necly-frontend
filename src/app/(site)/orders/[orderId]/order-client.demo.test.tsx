import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock } = vi.hoisted(() => ({ getOrderMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: true,
  checkoutApi: { getOrder: getOrderMock },
}));

import { OrderClient } from "./order-client";

describe("halaman pelacakan pesanan (demo)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
  });

  it("tidak memanggil checkoutApi.getOrder saat DEMO_MODE=true", async () => {
    render(<OrderClient orderId="ord-1" />);

    await waitFor(() => expect(getOrderMock).not.toHaveBeenCalled());
    expect(screen.getByText("Pesanan sandbox")).toBeInTheDocument();
  });
});