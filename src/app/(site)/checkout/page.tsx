import type { Metadata } from "next";
import Image from "next/image";
import { CheckoutCommerceClient } from "@/components/checkout-commerce-client";

export const metadata: Metadata = { title: "Checkout", description: "Lengkapi detail pesanan dan pilih metode pembayaran." };

export default function CheckoutPage() {
  return (
    <main className="commerce-checkout-page">
      <section className="commerce-checkout-hero"><div className="commerce-container commerce-checkout-hero-inner"><div><nav>⌂　›　Beranda　›　<span>Checkout</span></nav><h1>Checkout</h1><p>Lengkapi detail pesanan dan pilih metode pembayaran untuk melanjutkan.</p></div><Image src="/illustrations/product-workspace.svg" width={480} height={360} alt="Ilustrasi checkout" /></div></section>
      <div className="commerce-container"><CheckoutCommerceClient /></div>
    </main>
  );
}
