import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutCommerceClient } from "./checkout-commerce-client";

const { checkoutMock, pushMock } = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: unknown) => unknown) => selector({ items: [] }),
}));
vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  checkoutApi: { checkout: checkoutMock },
  bootstrapAuth: vi.fn().mockResolvedValue({ id: "usr-1" }),
  useAuthStore: { getState: () => ({ user: { id: "usr-1" } }) },
}));

describe("CheckoutCommerceClient", () => {
  beforeEach(() => {
    checkoutMock.mockReset();
    pushMock.mockReset();
  });

  it("mengurangi kode unik dari harga paket seperti desain referensi", () => {
    render(<CheckoutCommerceClient />);

    // Paket referensi: Rp 81.500, kode unik Rp 33 -> total Rp 81.467 (bukan 81.533).
    expect(screen.getAllByText("Rp 81.467").length).toBeGreaterThan(0);
    expect(screen.queryByText("Rp 81.533")).not.toBeInTheDocument();
    expect(screen.getByText("Kode Unik")).toBeInTheDocument();
  });

  it("menampilkan bagian Ubah Durasi di samping Detail Pesanan", () => {
    render(<CheckoutCommerceClient />);

    expect(screen.getByRole("heading", { name: "Pilih Durasi Berlangganan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Detail Pesanan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ubah Durasi" })).toBeInTheDocument();
  });

  it("mengunci metode bank dan retail untuk durasi di bawah 6 bulan", () => {
    render(<CheckoutCommerceClient />);

    fireEvent.click(screen.getByRole("button", { name: "BNI" }));

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeDisabled();
    }
  });

  it("membuka kembali metode bank setelah durasi 6 bulan dipilih", () => {
    render(<CheckoutCommerceClient />);

    fireEvent.click(screen.getByRole("button", { name: "BNI" }));
    fireEvent.click(screen.getAllByRole("button", { name: "6 Bulan" })[0]);

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeEnabled();
    }
  });

  it("mengirim pesanan ke API lalu mengarahkan ke halaman pembayaran", async () => {
    checkoutMock.mockResolvedValue({ order: { id: "ord-123" }, payment: { id: "pay-1" }, checkout_url: "/payment/ord-123" });

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    expect(checkoutMock.mock.calls[0][0].items).toEqual([{ product_price_id: "one-month", quantity: 1 }]);
    expect(pushMock).toHaveBeenCalledWith("/payment/ord-123");
  });

  it("menampilkan pesan galat saat checkout gagal", async () => {
    checkoutMock.mockRejectedValue(new Error("Stok paket habis."));

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Stok paket habis.");
  });
});
