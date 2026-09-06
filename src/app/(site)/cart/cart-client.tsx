"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { cartTotals, formatIDR } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";

export function CartClient() {
  const hydrated = useHydrated();
  const [voucher, setVoucher] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [discount, setDiscount] = useState(0);
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = cartTotals(items, discount);

  if (!hydrated) return <div className="empty-state"><span className="skeleton" style={{ width: 180, height: 18 }} /></div>;

  const applyVoucher = () => {
    if (voucher.trim().toUpperCase() === "FIRST100") {
      setDiscount(100_000);
      setVoucherMessage("FIRST100 berhasil digunakan: hemat Rp100.000 (demo).");
    } else {
      setDiscount(0);
      setVoucherMessage("Kode promo demo tidak ditemukan. Coba FIRST100.");
    }
  };

  if (!items.length) return (
    <div className="empty-state"><ShoppingBag size={30} className="muted" /><h2 className="h2" style={{ fontSize: 28 }}>Keranjang belanja Anda masih kosong.</h2><p className="muted" style={{ margin: 0 }}>Temukan slot langganan akun bersama yang Anda butuhkan di katalog.</p><Link className="button button-primary" href="/products">Jelajahi produk</Link></div>
  );

  return (
    <div className="commerce-layout">
      <section className="cart-list" aria-label="Daftar produk di keranjang">
        {items.map((item) => (
          <article className="card cart-item accent-blue" key={item.id}>
            <span className="cart-thumb">{item.name.split(" ").map((word) => word[0]).slice(0,2)}</span>
            <div><span className="eyebrow" style={{ fontSize: 9 }}>{item.category}</span><h2 className="h3" style={{ marginTop: 5 }}>{item.name}</h2><p className="muted small" style={{ margin: "5px 0 0" }}>Slot akun langganan bersama</p></div>
            <div className="cart-item-actions" style={{ display: "grid", justifyItems: "end", gap: 10 }}>
              <strong className="tabular">{formatIDR(item.price * item.quantity)}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="quantity">
                  <button type="button" aria-label={`Kurangi jumlah ${item.name}`} disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}><Minus size={13} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={`Tambah jumlah ${item.name}`} disabled={item.quantity >= item.stock} onClick={() => setQuantity(item.id, item.quantity + 1)}><Plus size={13} /></button>
                </div>
                <button className="table-action" type="button" aria-label={`Hapus ${item.name}`} onClick={() => removeItem(item.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <aside className="card summary-card">
        <h2 className="h3">Ringkasan pesanan</h2>
        <div className="summary-lines">
          <div className="summary-line"><span>Subtotal</span><span className="tabular">{formatIDR(totals.subtotal)}</span></div>
          <div className="summary-line"><span>Diskon</span><span className="tabular">−{formatIDR(totals.discount)}</span></div>
          <div className="summary-line"><span>Biaya layanan (2.5%)</span><span className="tabular">{formatIDR(totals.serviceFee)}</span></div>
          <div className="summary-line summary-total"><span>Total</span><span className="tabular">{formatIDR(totals.total)}</span></div>
        </div>
        <div className="field" style={{ marginBottom: 16 }}><label className="label" htmlFor="voucher">Voucher demo</label><div className="voucher-form"><input id="voucher" className="input" value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="Coba FIRST100" /><button className="button button-secondary button-sm" type="button" onClick={applyVoucher}>Gunakan</button></div>{voucherMessage && <span className={discount ? "field-error" : "muted small"} style={discount ? { color: "var(--success)" } : undefined}>{voucherMessage}</span>}</div>
        <Link className="button button-primary" style={{ width: "100%" }} href="/checkout">Lanjutkan ke checkout</Link>
        <p className="muted" style={{ margin: "13px 0 0", fontSize: 9, textAlign: "center" }}>Periksa kembali pesanan Anda sebelum menuju langkah pembayaran.</p>
      </aside>
    </div>
  );
}
