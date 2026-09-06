import type { Metadata } from "next";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  title: "Penyelesaian pesanan",
  description: "Periksa data pemesan dan selesaikan pesanan slot langganan akun bersama di Necly.",
};

export default function CheckoutPage() {
  return (
    <div className="container">
      <header className="page-hero">
        <span className="eyebrow">Langkah 1 dari 2</span>
        <h1 className="h1" style={{ marginTop: 12 }}>Lengkapi data pesanan.</h1>
        <p className="lede" style={{ marginTop: 16, fontSize: 14 }}>
          Pastikan alamat email Anda aktif untuk pengiriman undangan resmi sebelum menuju tahap pembayaran.
        </p>
      </header>
      <CheckoutClient />
    </div>
  );
}
