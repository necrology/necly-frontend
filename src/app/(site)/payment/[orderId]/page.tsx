import type { Metadata } from "next";
import { PaymentClient } from "./payment-client";

export const metadata: Metadata = { title: "Status Pembayaran", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="payment-wrap">
      <header className="payment-head">
        <span className="badge status-info">Langkah 2 dari 2 · Xendit Test Mode</span>
        <h1 className="h1" style={{ fontSize: 38 }}>Status pembayaran</h1>
        <p className="lede" style={{ fontSize: 13 }}>Periksa status transaksi dan lanjutkan pembayaran melalui halaman aman Xendit.</p>
      </header>
      <PaymentClient orderId={orderId} />
    </div>
  );
}
