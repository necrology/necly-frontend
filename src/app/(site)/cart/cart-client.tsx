"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { catalogApi, DEMO_MODE } from "@/lib/api";
import { reconcileCartItems } from "@/lib/cart-reconciliation";
import { cartTotals, formatIDR } from "@/lib/money";
import { useCartStore, type CartItem } from "@/stores/cart-store";

/**
 * Kunci baris yang sama dengan yang dipakai store: id harga bila ada, baru id
 * produk. Halaman ini dulu memakai `item.id` untuk mengubah jumlah dan menghapus,
 * sementara store mencocokkan lewat `product_price_id` — sehingga untuk produk
 * dari katalog kedua tombol itu tidak berpengaruh apa pun.
 */
const lineKey = (item: Pick<CartItem, "id" | "product_price_id">) => item.product_price_id ?? item.id;

/** Ringkasan pilihan yang tersimpan saat produk ditambahkan dari katalog. */
function lineDetail(item: CartItem) {
  const parts = [item.selectedDuration, item.selectedDevice ? `${item.selectedDevice} perangkat` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Slot akun langganan bersama";
}

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("");
}

export function CartClient() {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const totals = cartTotals(items);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  // Keranjang tetap sumber pilihan pembeli, tetapi harga/stok live diperiksa
  // agar baris yang sudah tidak tersedia tidak baru ketahuan di pembayaran.
  // Harga tidak diubah diam-diam: perubahan harus disetujui di checkout.
  useEffect(() => {
    if (DEMO_MODE || !hydrated || items.length === 0) return;
    let cancelled = false;
    catalogApi.listProducts({ per_page: 100 })
      .then((response) => {
        if (cancelled) return;
        const result = reconcileCartItems(items, response.products);
        const unavailable = result.issues.filter((issue) => issue.reason === "unavailable");
        const changed = result.issues.some((issue) => issue.reason === "price_changed" || issue.reason === "quantity_adjusted");
        if (unavailable.length > 0) {
          setLiveNotice(`${unavailable.length} item tidak lagi tersedia dengan paket yang sama. Hapus item tersebut sebelum membayar.`);
        } else if (changed) {
          setLiveNotice("Harga atau stok salah satu item berubah di katalog. Total akan dikonfirmasi ulang sebelum pembayaran.");
        } else {
          setLiveNotice(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveNotice("Keranjang belum dapat diverifikasi ke katalog. Periksa kembali saat checkout.");
      });
    return () => { cancelled = true; };
  }, [hydrated, items]);

  if (!hydrated) return <div className="empty-state"><span className="skeleton" style={{ width: 180, height: 18 }} /></div>;

  if (!items.length) return (
    <div className="empty-state"><ShoppingBag size={30} className="muted" /><h2 className="h2" style={{ fontSize: 28 }}>Keranjang belanja Anda masih kosong.</h2><p className="muted" style={{ margin: 0 }}>Temukan slot langganan akun bersama yang Anda butuhkan di katalog.</p><Link className="button button-primary" href="/products">Jelajahi produk</Link></div>
  );

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="commerce-layout">
      <section className="cart-list" aria-label="Daftar produk di keranjang">
        {liveNotice && <p className="commerce-field-warning" role="status"><span aria-hidden="true">!</span>{liveNotice}</p>}
        {items.map((item, index) => {
          const key = lineKey(item);
          return (
            <article className="card cart-item accent-blue" key={`${key}-${index}`}>
              <span className="cart-thumb" aria-hidden="true">{initials(item.name)}</span>
              <div>
                <span className="eyebrow" style={{ fontSize: 9 }}>{item.category}</span>
                <h2 className="h3" style={{ marginTop: 5 }}>{item.name}</h2>
                <p className="muted small" style={{ margin: "5px 0 0" }}>{lineDetail(item)}</p>
                <p className="muted small" style={{ margin: "3px 0 0" }}>{formatIDR(item.price)} × {item.quantity}</p>
              </div>
              <div className="cart-item-actions" style={{ display: "grid", justifyItems: "end", gap: 10 }}>
                <strong className="tabular">{formatIDR(item.price * item.quantity)}</strong>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="quantity">
                    <button type="button" aria-label={`Kurangi jumlah ${item.name}`} disabled={item.quantity <= 1} onClick={() => setQuantity(key, item.quantity - 1)}><Minus size={13} /></button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label={`Tambah jumlah ${item.name}`} disabled={item.quantity >= item.stock} onClick={() => setQuantity(key, item.quantity + 1)}><Plus size={13} /></button>
                  </div>
                  <button className="table-action" type="button" aria-label={`Hapus ${item.name}`} onClick={() => removeItem(key)}><Trash2 size={13} /></button>
                </div>
              </div>
            </article>
          );
        })}
        <button className="button button-ghost button-sm" type="button" style={{ justifySelf: "start" }} onClick={clear}>Kosongkan keranjang</button>
      </section>
      <aside className="card summary-card">
        <h2 className="h3">Ringkasan pesanan</h2>
        <div className="summary-lines">
          <div className="summary-line"><span>Subtotal ({totalUnits} item)</span><span className="tabular">{formatIDR(totals.subtotal)}</span></div>
          <div className="summary-line summary-total"><span>Total</span><span className="tabular">{formatIDR(totals.total)}</span></div>
        </div>
        <Link className="button button-primary" style={{ width: "100%" }} href="/checkout">Lanjutkan ke checkout</Link>
        <p className="muted" style={{ margin: "13px 0 0", fontSize: 9, textAlign: "center" }}>Voucher dan metode pembayaran dipilih di halaman checkout.</p>
      </aside>
    </div>
  );
}
