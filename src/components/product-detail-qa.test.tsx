import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/stores/cart-store", () => ({ useCartStore: (selector: (state: unknown) => unknown) => selector({ addItem: vi.fn() }) }));

import { ProductDetailClient } from "./product-detail-client";
import { products } from "@/data/products";

const product = products[0];

describe("QA halaman detail produk", () => {
  beforeEach(() => pushMock.mockReset());

  it("menghapus kontrol jumlah perangkat dari detail tanpa mengubah pilihan paket dan durasi", () => {
    render(<ProductDetailClient product={product} />);

    expect(screen.getByRole("heading", { name: /Pilih Durasi Berlangganan/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Pilih Jumlah Perangkat/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1 Perangkat" })).not.toBeInTheDocument();
  });

  it("menandai paket dan durasi wajib sebelum memesan", () => {
    render(<ProductDetailClient product={product} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Pesan/ })[0]);

    expect(screen.getByText("Pilih paket dahulu sebelum memesan.")).toBeInTheDocument();
    expect(screen.getByText("Pilih durasi berlangganan dahulu sebelum memesan.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("mengizinkan pemesanan setelah paket dan durasi diklik", () => {
    render(<ProductDetailClient product={product} />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(product.packageName) }));
    fireEvent.click(screen.getByRole("button", { name: "1 Bulan" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Pesan/ })[0]);

    expect(pushMock).toHaveBeenCalledWith("/checkout");
  });

  it('mengisi card "Informasi" dengan ketentuan perangkat, daftar perangkat, dan masa aktif', () => {
    render(<ProductDetailClient product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Informasi" }));

    expect(screen.getByText(/ketentuan paket yang Anda pilih/)).toBeInTheDocument();
    expect(screen.getByText(/Smartphone, Laptop\/PC, Smart TV/)).toBeInTheDocument();
    expect(screen.getByText(/otomatis berakhir 1 bulan setelah tanggal CO \(checkout\)/)).toBeInTheDocument();
    expect(screen.getByText(/Laporan Kendala/)).toBeInTheDocument();
  });

  it("menampilkan skema harga asli dari rincian patungan admin", () => {
    const priced = {
      ...product,
      priceOptions: product.priceOptions.map((option, index) => index === 0 ? {
        ...option,
        price: 55_000,
        baseAmount: 300_000,
        adminFee: 30_000,
        memberSlots: 5,
        adminIncluded: true,
      } : option),
    };

    render(<ProductDetailClient product={priced} />);

    expect(screen.getByText(/÷ 6 = Rp 55\.000/)).toBeInTheDocument();
    expect(screen.getByText("Rp 30.000")).toBeInTheDocument();
    expect(screen.getByText("5 orang + admin")).toBeInTheDocument();
  });
});
