"use client";

import { AlertCircle, BadgeCheck, ChevronRight, CircleDollarSign, Headphones, Info, LoaderCircle, LockKeyhole, MessageCircle, ShieldCheck, UsersRound, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { products } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { ProductBrand } from "@/components/product-brand";
import { useCartStore } from "@/stores/cart-store";
import { bootstrapAuth, checkoutApi, DEMO_MODE, useAuthStore } from "@/lib/api";

const durationLabels = ["1 Bulan", "3 Bulan", "6 Bulan", "12 Bulan"];
const payments = [
  ["QRIS", "qris"], ["OVO", "ovo"], ["DANA", "dana"], ["ShopeePay", "shopeepay"], ["LinkAja", "linkaja"],
  ["Alfamart", "alfamart"], ["BNI", "bni"], ["BSI", "bsi"], ["BANK BRI", "bri"], ["mandiri", "mandiri"],
] as const;
const safeguards = [["Pembayaran Aman", "Semua transaksi diproses dengan enkripsi terpercaya.", ShieldCheck], ["Proses Cepat", "Pembayaran otomatis terkonfirmasi.", Zap], ["Dukungan 24/7", "Tim kami siap membantu kapan saja.", Headphones], ["Ribuan Pelanggan Puas", "Dipercaya oleh 75.000+ pengguna di seluruh Indonesia.", UsersRound]] as const;
const MANUAL_PAYMENTS = ["Alfamart", "BNI", "BSI", "BANK BRI", "mandiri"];
const UNIQUE_CODE = 33;
const DEMO_ORDER_ID = "NCL-DEMO-260906";

function generateIdempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutCommerceClient() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const [duration, setDuration] = useState(0);
  const [payment, setPayment] = useState("QRIS");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucher, setVoucher] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const product = useMemo(() => {
    const cartItem = items[0];
    return products.find((item) => item.id === cartItem?.id || item.slug === cartItem?.slug) ?? products[0];
  }, [items]);
  const price = product.priceOptions[duration]?.price ?? product.price;
  // The reference design subtracts the unique code from the package price (81.500 - 33 = 81.467).
  const total = Math.max(0, Math.max(0, price - discount) - UNIQUE_CODE);
  const manualMethodLocked = MANUAL_PAYMENTS.includes(payment) && duration < 2;
  const selectDuration = (index: number) => {
    setDuration(index);
    if (index < 2 && MANUAL_PAYMENTS.includes(payment)) setPayment("QRIS");
  };
  const durationGrid = (
    <div className="commerce-duration-choice-grid">
      {durationLabels.map((label, index) => (
        <button key={label} className={duration === index ? "selected" : ""} type="button" aria-pressed={duration === index} onClick={() => selectDuration(index)}>
          <span className="commerce-radio" />
          {label}
        </button>
      ))}
    </div>
  );

  const pay = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (DEMO_MODE) {
        router.push(`/payment/${DEMO_ORDER_ID}`);
        return;
      }

      const user = useAuthStore.getState().user ?? (await bootstrapAuth());
      if (!user) {
        router.push("/login?redirect=/checkout");
        return;
      }

      const orderItems = items.length
        ? items.map((item) => ({ product_price_id: item.product_price_id ?? item.id, quantity: item.quantity }))
        : [{ product_price_id: product.priceOptions[duration]?.id ?? product.id, quantity: 1 }];

      const response = await checkoutApi.checkout(
        { voucher_code: voucher.trim().toUpperCase() || undefined, items: orderItems },
        generateIdempotencyKey(),
      );
      router.push(`/payment/${response.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout gagal. Coba lagi.");
      setSubmitting(false);
    }
  };

  const payDisabled = manualMethodLocked || submitting;

  const applyVoucher = () => {
    const code = voucher.trim().toUpperCase();
    if (code === "HEMAT10") {
      setDiscount(Math.round(price * 0.1));
      setVoucherMessage("Voucher HEMAT10 dipakai: hemat 10%.");
      return;
    }
    setDiscount(0);
    setVoucherMessage(code ? "Kode voucher tidak dikenali. Coba HEMAT10." : "Masukkan kode voucher terlebih dahulu.");
  };

  return (
    <div className="commerce-checkout-layout">
      <div className="commerce-checkout-content">
        <section className="commerce-checkout-section commerce-duration-section">
          <h2>Pilih Durasi Berlangganan</h2>
          {durationGrid}
        </section>
        <section className="commerce-checkout-section">
          <h2>Detail Pesanan</h2>
          <div className="commerce-checkout-product">
            <div className="commerce-checkout-product-art"><ProductBrand product={product} compact /></div>
            <div>
              <strong>{product.name} - {product.packageName}</strong>
              <p>{product.description}</p>
              <div className="commerce-checkout-tags"><span>{product.accessType}</span><span>Harga Spesial</span><span>Proses Cepat</span></div>
            </div>
            <b>{formatRupiahLabel(price)} <small>/ ({durationLabels[duration]})</small></b>
          </div>
        </section>
        <section className="commerce-checkout-section">
          <h2>Ubah Durasi</h2>
          {durationGrid}
        </section>
        <section className="commerce-checkout-section commerce-voucher-section">
          <h2>Voucher</h2>
          {voucherOpen ? (
            <div className="commerce-voucher-input">
              <input aria-label="Kode voucher" value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="Masukkan kode voucher" />
              <button type="button" onClick={applyVoucher}>Pakai</button>
            </div>
          ) : (
            <button type="button" onClick={() => setVoucherOpen(true)}><CircleDollarSign size={26} />Punya kode voucher Akunmu?<ChevronRight size={26} /></button>
          )}
          {voucherMessage && <p className="commerce-checkout-fallback"><BadgeCheck size={16} />{voucherMessage}</p>}
        </section>
        <section className="commerce-checkout-section">
          <h2>Pilih Metode Pembayaran</h2>
          <div className="commerce-payment-grid">{payments.map(([label, tone]) => <button key={label} className={`commerce-payment-option ${tone} ${payment === label ? "selected" : ""}`} type="button" aria-pressed={payment === label} onClick={() => setPayment(label)}><span>{label}</span></button>)}</div>
          <div className="commerce-payment-note"><Info size={25} /><p>Metode pembayaran bank dan retail (Alfamart) hanya tersedia untuk pilihan durasi berlangganan minimal 6 bulan.</p></div>
        </section>
      </div>
      <aside className="commerce-checkout-summary">
        <h2>Rincian Pembayaran</h2>
        <div><span>Harga Paket</span><strong>{formatRupiahLabel(price)}</strong></div>
        {discount > 0 && <div><span>Voucher</span><strong>-{formatRupiahLabel(discount)}</strong></div>}
        <div><span>Kode Unik</span><strong>{formatRupiahLabel(UNIQUE_CODE)}</strong></div>
        <div><span>Metode</span><strong>{payment}</strong></div>
        <hr />
        <div className="commerce-checkout-total"><span>Total Bayar</span><b>{formatRupiahLabel(total)}</b></div>
        <button className="commerce-primary-button" type="button" disabled={payDisabled} onClick={pay}>{submitting ? <LoaderCircle className="commerce-spin" size={20} /> : <LockKeyhole size={20} />}{submitting ? "Memproses…" : "Bayar"}</button>
        {manualMethodLocked && <p className="commerce-checkout-fallback"><AlertCircle size={16} />Pilih durasi minimal 6 bulan untuk metode {payment}.</p>}
        {error && <p className="commerce-checkout-error" role="alert"><AlertCircle size={16} />{error}</p>}
        <a className="commerce-admin-button" href="https://wa.me/6282115297376" target="_blank" rel="noreferrer"><MessageCircle size={23} />Hubungi Admin</a>
      </aside>
      <aside className="commerce-transaction-trust"><h2>Transaksi Aman & Terpercaya</h2>{safeguards.map(([title, detail, Icon]) => <article key={title}><span><Icon size={25} /></span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</aside>
      <div className="commerce-mobile-payment-bar"><span><small>Total Bayar</small><b>{formatRupiahLabel(total)}</b></span><button type="button" disabled={payDisabled} onClick={pay}>{submitting ? "Memproses…" : "Bayar"}</button></div>
      {!items.length && <p className="commerce-checkout-fallback"><AlertCircle size={16} />Menampilkan paket referensi; tambahkan produk dari katalog untuk menyimpannya di keranjang.</p>}
    </div>
  );
}
