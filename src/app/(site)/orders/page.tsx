import type { Metadata } from "next";
import { OrderHistoryClient } from "./order-history-client";

export const metadata: Metadata = {
  title: "Pesanan saya",
  robots: { index: false, follow: false },
};

/**
 * Daftar pesanan milik pengguna yang sedang masuk. Data selalu berasal dari
 * endpoint terautentikasi `/orders`; halaman ini tidak pernah membaca data seed
 * saat mode live agar pesanan pengguna lain tidak mungkin tampil.
 */
export default function OrdersPage() {
  return <OrderHistoryClient />;
}
