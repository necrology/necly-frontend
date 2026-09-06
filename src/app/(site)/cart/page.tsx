import type { Metadata } from "next";
import { CartClient } from "./cart-client";

export const metadata: Metadata = { title: "Keranjang belanja", description: "Periksa pilihan slot langganan Anda sebelum melanjutkan." };

export default function CartPage() {
  return <div className="container"><header className="page-hero"><span className="eyebrow">Pilihan Anda</span><h1 className="h1" style={{ marginTop: 12 }}>Keranjang belanja</h1><p className="lede" style={{ marginTop: 16, fontSize: 14 }}>Periksa durasi dan jumlah slot sebelum melanjutkan ke pengisian data pesanan.</p></header><CartClient /></div>;
}
