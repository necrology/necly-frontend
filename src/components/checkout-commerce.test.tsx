import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutCommerceClient } from "./checkout-commerce-client";

// Id harga dari katalog API selalu UUID; id data contoh lokal berbentuk slug
// seperti "one-month", dan checkout menolak yang bukan UUID.
const PRICE_ID = "3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";

const { checkoutMock, pushMock, cartItems } = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  pushMock: vi.fn(),
  cartItems: { value: [] as unknown[] },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: unknown) => unknown) => selector({ items: cartItems.value }),
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
    // Sebuah baris keranjang yang sah: id harganya UUID dari katalog API, dan
    // belum ada perangkat terpilih sehingga pemilihnya masih diuji.
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 1 }];
  });

  // Total di layar harus sama dengan yang ditagih backend: jumlah harga ×
  // kuantitas. Tidak ada kode unik maupun biaya layanan yang ditambahkan.
  it("menampilkan total sebesar subtotal keranjang", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 3 }];

    render(<CheckoutCommerceClient />);

    expect(screen.getAllByText("Rp 150.000").length).toBeGreaterThan(0);
    expect(screen.getByText("Subtotal (3 item)")).toBeInTheDocument();
    expect(screen.queryByText("Kode Unik")).not.toBeInTheDocument();
  });

  it("menampilkan satu baris per item keranjang, bukan hanya yang pertama", () => {
    cartItems.value = [
      { id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 1 },
      { id: "spotify", slug: "spotify-premium", name: "Spotify Premium", category: "Streaming", price: 30_000, stock: 5, product_price_id: "0c9d8e7f-6a5b-4c3d-9e8f-1a2b3c4d5e6f", quantity: 2 },
    ];

    render(<CheckoutCommerceClient />);

    expect(screen.getByRole("heading", { name: "Detail Pesanan" })).toBeInTheDocument();
    expect(screen.getByText("Netflix Premium")).toBeInTheDocument();
    expect(screen.getByText("Spotify Premium")).toBeInTheDocument();
    // 50.000 + (30.000 × 2) = 110.000
    expect(screen.getAllByText("Rp 110.000").length).toBeGreaterThan(0);
    expect(screen.getByText("Subtotal (3 item)")).toBeInTheDocument();
  });

  it("mengunci metode bank dan retail untuk durasi di bawah 6 bulan", () => {
    render(<CheckoutCommerceClient />);

    fireEvent.click(screen.getByRole("button", { name: "BNI" }));

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeDisabled();
    }
  });

  // Durasi ditentukan di keranjang, jadi aturan bank/retail mengikuti durasi
  // yang benar-benar dipesan — bukan pilihan di halaman ini.
  it("membuka metode bank bila keranjang berisi durasi 6 bulan", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 1, selectedDuration: "6 Bulan", selectedDevice: 1 }];

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "BNI" }));

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeEnabled();
    }
  });

  it("mengirim pesanan ke API lalu mengarahkan ke halaman pembayaran", async () => {
    checkoutMock.mockResolvedValue({ order: { id: "ord-123" }, payment: { id: "pay-1" }, checkout_url: "/payment/ord-123" });

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    // QA baris 38: jumlah perangkat yang diklik ikut terkirim bersama item.
    expect(checkoutMock.mock.calls[0][0].items).toEqual([{ product_price_id: PRICE_ID, quantity: 1, device_count: 1 }]);
    expect(pushMock).toHaveBeenCalledWith("/payment/ord-123");
  });

  // Keranjang bisa memuat dua baris dengan harga sama; backend menolak item
  // duplikat dalam satu pesanan, dan itulah yang membuat checkout selalu
  // dijawab 400 "Input tidak valid".
  it("menggabungkan baris keranjang dengan harga sama sebelum mengirim", async () => {
    checkoutMock.mockResolvedValue({ order: { id: "ord-1" }, payment: { id: "pay-1" }, checkout_url: "/payment/ord-1" });
    const line = { id: "netflix", slug: "netflix", name: "Netflix", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, selectedDevice: 2 };
    cartItems.value = [{ ...line, quantity: 1 }, { ...line, quantity: 2 }];

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    expect(checkoutMock.mock.calls[0][0].items).toEqual([{ product_price_id: PRICE_ID, quantity: 3, device_count: 2 }]);
  });

  // Id data contoh lokal (slug) tidak ada di database, jadi checkout tidak akan
  // pernah berhasil; lebih baik tombolnya mati dengan penjelasan.
  it("menolak membayar ketika item keranjang berasal dari katalog lama", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix", category: "Streaming", price: 50_000, stock: 5, product_price_id: "one-month", quantity: 1 }];

    render(<CheckoutCommerceClient />);

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole("alert")).toHaveTextContent(/katalog lama/);
  });

  it("menolak membayar ketika keranjang kosong", () => {
    cartItems.value = [];

    render(<CheckoutCommerceClient />);

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole("alert")).toHaveTextContent(/Keranjang masih kosong/);
  });

  it("menampilkan pesan galat saat checkout gagal", async () => {
    checkoutMock.mockRejectedValue(new Error("Stok paket habis."));

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Stok paket habis.");
  });

  // QA baris 38 & 39: jumlah perangkat wajib diklik, dan bila belum dipilih
  // muncul peringatan merah alih-alih langsung memproses pembayaran.
  it("mewajibkan pemilihan jumlah perangkat sebelum membayar", () => {
    render(<CheckoutCommerceClient />);

    expect(screen.getByRole("heading", { name: /Pilih Jumlah Perangkat/ })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(screen.getByRole("alert")).toHaveTextContent("Pilih jumlah perangkat dahulu sebelum membayar.");
    expect(checkoutMock).not.toHaveBeenCalled();
  });
});
