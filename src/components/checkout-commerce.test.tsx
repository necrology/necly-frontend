import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutCommerceClient } from "./checkout-commerce-client";

// Id harga dari katalog API selalu UUID; id data contoh lokal berbentuk slug
// seperti "one-month", dan checkout menolak yang bukan UUID.
const PRICE_ID = "3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";

const { checkoutMock, catalogMock, pushMock, replaceItemsMock, cartItems } = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  catalogMock: vi.fn(),
  pushMock: vi.fn(),
  replaceItemsMock: vi.fn(),
  cartItems: { value: [] as unknown[] },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (state: unknown) => unknown) => selector({ items: cartItems.value, replaceItems: replaceItemsMock }),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    catalogApi: { ...actual.catalogApi, listProducts: catalogMock },
    checkoutApi: { ...actual.checkoutApi, checkout: checkoutMock },
    bootstrapAuth: vi.fn().mockResolvedValue({ id: "usr-1" }),
    useAuthStore: { getState: () => ({ user: { id: "usr-1" } }) },
  };
});

const SECOND_PRICE_ID = "0c9d8e7f-6a5b-4c3d-9e8f-1a2b3c4d5e6f";

function catalogWith(price: number) {
  return {
    products: [
      {
        id: "netflix",
        name: "Netflix Premium",
        slug: "netflix",
        description: "Slot Netflix",
        category: { id: "cat-streaming", name: "Streaming", slug: "streaming" },
        prices: [{ id: PRICE_ID, amount: price, active: true, available_slots: 5, duration: { id: "dur-30", name: "1 Bulan", days: 30 } }],
      },
      {
        id: "spotify",
        name: "Spotify Premium",
        slug: "spotify-premium",
        description: "Slot Spotify",
        category: { id: "cat-streaming", name: "Streaming", slug: "streaming" },
        prices: [{ id: SECOND_PRICE_ID, amount: 30_000, active: true, available_slots: 5, duration: { id: "dur-30", name: "1 Bulan", days: 30 } }],
      },
    ],
    page: 1,
    per_page: 100,
    total: 2,
  };
}

describe("CheckoutCommerceClient", () => {
  beforeEach(() => {
    checkoutMock.mockReset();
    catalogMock.mockReset();
    catalogMock.mockResolvedValue(catalogWith(50_000));
    pushMock.mockReset();
    replaceItemsMock.mockReset();
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
      { id: "spotify", slug: "spotify-premium", name: "Spotify Premium", category: "Streaming", price: 30_000, stock: 5, product_price_id: SECOND_PRICE_ID, quantity: 2 },
    ];

    render(<CheckoutCommerceClient />);

    expect(screen.getByRole("heading", { name: "Detail Pesanan" })).toBeInTheDocument();
    expect(screen.getByText("Netflix Premium")).toBeInTheDocument();
    expect(screen.getByText("Spotify Premium")).toBeInTheDocument();
    // 50.000 + (30.000 × 2) = 110.000
    expect(screen.getAllByText("Rp 110.000").length).toBeGreaterThan(0);
    expect(screen.getByText("Subtotal (3 item)")).toBeInTheDocument();
  });

  it("memperingatkan metode bank dan retail tanpa mengunci tombol Bayar", () => {
    render(<CheckoutCommerceClient />);

    fireEvent.click(screen.getByRole("button", { name: "BNI" }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/minimal 6 bulan/);

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeEnabled();
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

  // Katalog API menuliskan durasi dalam hari ("180 hari" untuk paket 6 bulan),
  // jadi angka mentahnya tidak boleh dipakai sebagai jumlah bulan.
  it("membaca durasi katalog API dalam hari sebagai bulan, bukan angka mentah", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 1, selectedDuration: "180 hari", selectedDevice: 1 }];

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "BNI" }));

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeEnabled();
    }
  });

  it("memperingatkan metode bank untuk paket 30 hari tanpa mengunci pembayaran", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 1, selectedDuration: "30 hari", selectedDevice: 1 }];

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "BNI" }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/minimal 6 bulan/);
    expect(screen.getAllByRole("button", { name: "Bayar" })[0]).toBeEnabled();
  });

  // Keranjang bisa memuat paket 12 bulan dan 1 bulan sekaligus; aturan bank harus
  // mengikuti yang terpendek, bukan item pertama.
  it("memakai durasi terpendek bila keranjang memuat beberapa durasi", () => {
    cartItems.value = [
      { id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, quantity: 1, selectedDuration: "12 Bulan", selectedDevice: 1 },
      { id: "spotify", slug: "spotify", name: "Spotify Premium", category: "Streaming", price: 30_000, stock: 5, product_price_id: SECOND_PRICE_ID, quantity: 1, selectedDuration: "1 Bulan", selectedDevice: 1 },
    ];

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "BNI" }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/minimal 6 bulan/);
    expect(screen.getAllByRole("button", { name: "Bayar" })[0]).toBeEnabled();
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

  // Keranjang lama tidak boleh mengunci pembeli; checkout akan memigrasikan id
  // paket dari katalog sebelum membuat pesanan.
  it("tetap membuka pembayaran ketika item berasal dari katalog lama", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix", category: "Streaming", price: 50_000, stock: 5, product_price_id: "one-month", quantity: 1 }];

    render(<CheckoutCommerceClient />);

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeEnabled();
    }
    expect(screen.getByRole("status")).toHaveTextContent(/diperbarui otomatis/);
  });

  it("menolak membayar ketika keranjang kosong", () => {
    cartItems.value = [];

    render(<CheckoutCommerceClient />);

    for (const button of screen.getAllByRole("button", { name: "Bayar" })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole("alert")).toHaveTextContent(/Keranjang masih kosong/);
  });

  // Tombol Bayar yang mati tanpa keterangan membuat pembeli mengira dirinya
  // belum masuk; alasannya harus terbaca tepat di sebelah tombolnya.
  it("menjelaskan alasan tombol Bayar mati saat keranjang kosong", () => {
    cartItems.value = [];

    render(<CheckoutCommerceClient />);

    expect(screen.getByRole("status")).toHaveTextContent("Keranjang masih kosong, jadi belum ada yang bisa dibayar.");
  });

  it("menjelaskan alasan tombol Bayar mati saat item berasal dari katalog lama", () => {
    cartItems.value = [{ id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: "one-month", quantity: 1 }];

    render(<CheckoutCommerceClient />);

    expect(screen.getByRole("status")).toHaveTextContent("1 item di keranjang berasal dari katalog lama dan akan diperbarui otomatis");
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

  it("mengirim total yang ditampilkan dan kanal pembayaran kanonik", async () => {
    checkoutMock.mockResolvedValue({ order: { id: "ord-1" }, payment: { id: "pay-1" }, checkout_url: "/payment/ord-1" });

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getByRole("button", { name: "BNI" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    expect(checkoutMock.mock.calls[0][0]).toMatchObject({
      items: [{ product_price_id: PRICE_ID, quantity: 1, device_count: 1 }],
      expected_subtotal: 50_000,
      payment_channel: "bni_va",
    });
  });

  it("meminta persetujuan harga baru sebelum memanggil checkout", async () => {
    catalogMock.mockResolvedValue(catalogWith(60_000));
    checkoutMock.mockResolvedValue({ order: { id: "ord-1" }, payment: { id: "pay-1" }, checkout_url: "/payment/ord-1" });

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByRole("button", { name: "Setujui total baru" })).toBeInTheDocument();
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(replaceItemsMock).toHaveBeenCalledWith([
      expect.objectContaining({ product_price_id: PRICE_ID, price: 60_000, selectedPrice: 60_000 }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Setujui total baru" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    expect(checkoutMock.mock.calls[0][0]).toMatchObject({ expected_subtotal: 60_000 });
  });

  it("menampilkan konflik harga dari server sebagai total yang harus disetujui", async () => {
    checkoutMock.mockRejectedValueOnce(new ApiError("Harga berubah", 409, { code: "price_changed", current_subtotal: 75_000, currency: "IDR" }));
    checkoutMock.mockResolvedValueOnce({ order: { id: "ord-1" }, payment: { id: "pay-1" }, checkout_url: "/payment/ord-1" });

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByRole("button", { name: "Setujui total baru" })).toBeInTheDocument();
    expect(screen.getByText(/total terbaru Rp 75\.000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Setujui total baru" }));
    expect(screen.getByText("Penyesuaian harga server")).toBeInTheDocument();
    expect(screen.getAllByText("Rp 75.000").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    await waitFor(() => expect(checkoutMock).toHaveBeenCalledTimes(2));
    expect(checkoutMock.mock.calls[1][0]).toMatchObject({ expected_subtotal: 75_000 });
  });

  it("menampilkan error kanal tidak didukung tanpa mengganti metode", async () => {
    checkoutMock.mockRejectedValue(new ApiError("Metode pembayaran tidak didukung", 400, { code: "unsupported_payment_channel" }));

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getByRole("button", { name: "DANA" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByText(/Metode DANA tidak didukung oleh penyedia pembayaran/)).toBeInTheDocument();
    expect(checkoutMock).toHaveBeenCalledTimes(1);
    expect(checkoutMock.mock.calls[0][0]).toMatchObject({ payment_channel: "dana" });
  });

  it("memblokir pembayaran ketika harga di keranjang sudah tidak ada di katalog", async () => {
    catalogMock.mockResolvedValue({
      ...catalogWith(50_000),
      products: [{
        ...catalogWith(50_000).products[1],
        prices: [{ id: "0192f0a4-0000-0000-0000-000000000099", amount: 50_000, active: true, available_slots: 5, duration: { id: "dur-30", name: "1 Bulan", days: 30 } }],
      }],
    });

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getByRole("button", { name: "1 Perangkat" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByText(/tidak lagi tersedia dengan paket yang sama/)).toBeInTheDocument();
    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it("memblokir baris duplikat yang totalnya melebihi stok sebelum bayar", async () => {
    const base = catalogWith(50_000);
    catalogMock.mockResolvedValue({
      ...base,
      products: [{
        ...base.products[0],
        prices: [{ ...base.products[0].prices[0], available_slots: 1 }],
      }, base.products[1]],
    });
    const line = { id: "netflix", slug: "netflix", name: "Netflix Premium", category: "Streaming", price: 50_000, stock: 5, product_price_id: PRICE_ID, selectedDevice: 1 };
    cartItems.value = [{ ...line, quantity: 1 }, { ...line, quantity: 1 }];

    render(<CheckoutCommerceClient />);
    fireEvent.click(screen.getAllByRole("button", { name: "Bayar" })[0]);

    expect(await screen.findByText(/melebihi stok tersedia/)).toBeInTheDocument();
    expect(checkoutMock).not.toHaveBeenCalled();
  });
});
