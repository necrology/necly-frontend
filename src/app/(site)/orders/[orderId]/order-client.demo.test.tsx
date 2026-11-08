import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderMock } = vi.hoisted(() => ({ getOrderMock: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: true,
    checkoutApi: { ...actual.checkoutApi, getOrder: getOrderMock },
    bootstrapAuth: vi.fn().mockResolvedValue({ id: "usr-1" }),
  };
});

import { OrderClient } from "./order-client";

describe("halaman pelacakan pesanan (demo)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
  });

  it("tidak memanggil checkoutApi.getOrder saat DEMO_MODE=true", async () => {
    render(<OrderClient orderId="ord-1" />);

    expect(await screen.findByText("Pesanan sandbox")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Detail & Progres Pesanan" })).toBeInTheDocument();
    expect(screen.queryByText("Pelacakan pesanan")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salin nomor pesanan NCL-DEMO-ord-1/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Laporkan kendala" })).toHaveClass("button-warning");
    expect(getOrderMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Akses akun & OTP" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buka halaman Ambil OTP" })).not.toBeInTheDocument();
  });
});