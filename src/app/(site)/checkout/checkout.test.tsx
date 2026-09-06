import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutClient } from "./checkout-client";
import CheckoutPage, { metadata as checkoutMetadata } from "./page";

const { checkoutMock, pushMock } = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  checkoutApi: { checkout: checkoutMock },
  bootstrapAuth: vi.fn().mockResolvedValue({ id: "usr-1" }),
  useAuthStore: {
    getState: () => ({ user: { id: "usr-1" } }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const mockItems = [
  {
    id: "prd-1",
    slug: "netflix-premium",
    name: "Netflix Premium",
    category: "Streaming",
    price: 186000,
    quantity: 1,
    stock: 5,
    product_price_id: "price-1",
  },
];

vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: unknown) => unknown) =>
    selector({
      items: mockItems,
    }),
}));

describe("Halaman dan Alur Checkout", () => {
  beforeEach(() => {
    checkoutMock.mockReset();
    pushMock.mockReset();
  });

  it("memiliki metadata bahasa Indonesia yang jelas", () => {
    expect(checkoutMetadata.title).toBe("Penyelesaian pesanan");
    expect(checkoutMetadata.description).not.toContain("project brief");
  });

  it("menampilkan formulir pemesanan dengan copy akun sharing", () => {
    render(<CheckoutClient />);

    expect(screen.getByRole("heading", { name: "Data pemesan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Catatan pesanan" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Catatan untuk tim aktivasi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lanjutkan ke pembayaran/i })).toBeInTheDocument();
    expect(screen.queryByText(/Kontak proyek/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ringkasan kerja/i)).not.toBeInTheDocument();
  });

  it("memproses checkout dan mengarahkan ke halaman pembayaran saat valid", async () => {
    checkoutMock.mockResolvedValue({
      order: { id: "ord-123" },
      payment: { id: "pay-123" },
      checkout_url: "/payment/ord-123",
    });

    render(<CheckoutClient />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Nabila Rahma" } });
    fireEvent.change(screen.getByLabelText("Alamat email"), { target: { value: "nabila@example.id" } });
    fireEvent.change(screen.getByLabelText(/Catatan untuk tim aktivasi/i), {
      target: { value: "Mohon kirim undangan ke email ini untuk profil terpisah." },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Lanjutkan ke pembayaran/i }));

    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/payment/ord-123");
  });
});
