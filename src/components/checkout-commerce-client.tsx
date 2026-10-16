"use client";

import { AlertCircle, BadgeCheck, ChevronRight, CircleDollarSign, Headphones, LifeBuoy, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UsersRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { contact } from "@/data/contact";
import { defaultDeviceOptions, products } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { continueToCheckout } from "@/lib/checkout-navigation";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { bootstrapAuth, checkoutApi, DEMO_MODE, useAuthStore } from "@/lib/api";

const payments = [
  ["QRIS", "qris"], ["OVO", "ovo"], ["DANA", "dana"], ["ShopeePay", "shopeepay"], ["LinkAja", "linkaja"],
  ["Alfamart", "alfamart"], ["BNI", "bni"], ["BSI", "bsi"], ["BANK BRI", "bri"], ["mandiri", "mandiri"],
] as const;
const safeguards = [["Pembayaran Aman", "Semua transaksi diproses dengan enkripsi terpercaya.", ShieldCheck], ["Proses Cepat", "Pembayaran otomatis terkonfirmasi.", Zap], ["Dukungan 24/7", "Tim kami siap membantu kapan saja.", Headphones], ["Ribuan Pelanggan Puas", "Dipercaya oleh 75.000+ pengguna di seluruh Indonesia.", UsersRound]] as const;
const MANUAL_PAYMENTS = ["Alfamart", "BNI", "BSI", "BANK BRI", "mandiri"];
const DEMO_ORDER_ID = "NCL-DEMO-260906";

// Id harga dari katalog API selalu UUID; id data contoh lokal berbentuk slug.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateIdempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const lineKey = (item: Pick<CartItem, "id" | "product_price_id">) => item.product_price_id ?? item.id;

function lineDetail(item: CartItem) {
  const parts = [item.selectedDuration, item.selectedDevice ? `${item.selectedDevice} perangkat` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : item.category;
}

export function CheckoutCommerceClient() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const [payment, setPayment] = useState("QRIS");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucher, setVoucher] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherFailed, setVoucherFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Baris 38 & 39: jumlah perangkat wajib dipilih. Bila pembeli sudah memilihnya
  // di halaman detail, pilihannya ikut dari keranjang.
  const [device, setDevice] = useState<number | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);

  const product = useMemo(() => {
    const cartItem = items[0];
    return products.find((item) => item.id === cartItem?.id || item.slug === cartItem?.slug) ?? products[0];
  }, [items]);
  const deviceOptions: number[] = product.deviceOptions?.length ? product.deviceOptions : [...defaultDeviceOptions];
  const selectedDevice = device ?? items[0]?.selectedDevice ?? null;

  // Seluruh angka di halaman ini berasal dari keranjang. Sebelumnya harga dihitung
  // dari satu produk contoh dan dikurangi "kode unik" Rp33 serta potongan voucher
  // yang dikarang di klien — tidak satu pun pernah ditagih backend, sehingga total
  // di layar berbeda dari yang benar-benar dibayar.
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  // Durasi ditentukan di keranjang, bukan di sini: pesanan dibangun dari id harga
  // yang tersimpan di keranjang. Aturan bank/retail karena itu mengikuti durasi
  // yang benar-benar dipesan, bukan pilihan di halaman ini.
  const months = useMemo(() => {
    const parsed = Number.parseInt(items[0]?.selectedDuration ?? "", 10);
    return Number.isFinite(parsed) ? parsed : 1;
  }, [items]);
  const manualMethodLocked = MANUAL_PAYMENTS.includes(payment) && months < 6;

  // Keranjang bisa memuat id harga dari data contoh lokal — produk yang
  // ditambahkan sebelum katalog dari API selesai dimuat. Id seperti itu tidak ada
  // di database, jadi checkout tidak akan pernah berhasil; lebih baik dijelaskan
  // di muka daripada dibiarkan gagal dengan galat server.
  const staleCount = items.filter((item) => !UUID.test(item.product_price_id ?? "")).length;
  const needsCatalog = !DEMO_MODE && (items.length === 0 || staleCount > 0);
  const payDisabled = manualMethodLocked || submitting || needsCatalog;

  // Kode voucher hanya bisa diverifikasi backend saat pesanan dibuat — daftar
  // voucher tidak tersedia publik. Klien karena itu tidak mengarang potongan
  // harga; hasilnya terlihat pada pesanan yang terbentuk.
  const applyVoucher = () => {
    const code = voucher.trim().toUpperCase();
    setVoucher(code);
    if (!code) {
      setVoucherFailed(true);
      setVoucherMessage("Masukkan kode voucher terlebih dahulu.");
      return;
    }
    setVoucherFailed(false);
    setVoucherMessage(`Kode ${code} akan diperiksa saat pesanan dibuat.`);
  };

  const pay = async () => {
    setError("");
    if (selectedDevice === null) {
      setShowWarnings(true);
      return;
    }
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

      // Keranjang bisa memuat dua baris dengan harga yang sama — mis. ditambahkan
      // dari halaman katalog lalu dari halaman detail. Backend menolak item
      // duplikat dalam satu pesanan, jadi baris seperti itu digabung lebih dulu,
      // dengan jumlah dijumlahkan sesuai yang terlihat di keranjang.
      const merged = new Map<string, { product_price_id: string; quantity: number; device_count?: number }>();
      for (const item of items) {
        const priceId = item.product_price_id ?? item.id;
        const existing = merged.get(priceId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.device_count = existing.device_count ?? item.selectedDevice ?? selectedDevice ?? undefined;
          continue;
        }
        merged.set(priceId, {
          product_price_id: priceId,
          quantity: item.quantity,
          device_count: item.selectedDevice ?? selectedDevice ?? undefined,
        });
      }

      const response = await checkoutApi.checkout(
        { voucher_code: voucher.trim().toUpperCase() || undefined, items: [...merged.values()] },
        generateIdempotencyKey(),
      );
      continueToCheckout(response, router.push);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout gagal. Coba lagi.";
      // Backend menolak kode voucher yang tidak dikenal pada saat pesanan dibuat;
      // tampilkan sebagai masalah voucher supaya jelas bagi pembeli.
      if (/voucher/i.test(message)) {
        setVoucherFailed(true);
        setVoucherMessage("Kode Voucher Tidak dikenali");
      }
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="commerce-checkout-layout">
      <div className="commerce-checkout-content">
        <section className="commerce-checkout-section commerce-duration-section">
          <h2>Durasi Berlangganan</h2>
          <div className="commerce-checkout-duration-chips">
            {items.map((item) => <span key={lineKey(item)}>{item.selectedDuration ?? "1 Bulan"}</span>)}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Durasi mengikuti pilihan Anda saat menambahkan produk, dan pesanan dibangun dari keranjang. Untuk mengubahnya, hapus item di <Link href="/cart">keranjang</Link> lalu pilih ulang dari halaman produk.
          </p>
        </section>
        <section className="commerce-checkout-section">
          <h2>Pilih Jumlah Perangkat <span className="commerce-required" aria-hidden="true">*</span></h2>
          <div className="commerce-duration-choice-grid">{deviceOptions.map((devices) => <button key={devices} className={selectedDevice === devices ? "selected" : ""} type="button" aria-pressed={selectedDevice === devices} onClick={() => setDevice(devices)}><span className="commerce-radio" />{devices} Perangkat</button>)}</div>
          {showWarnings && selectedDevice === null && <p className="commerce-field-warning" role="alert"><AlertCircle size={15} />Pilih jumlah perangkat dahulu sebelum membayar.</p>}
        </section>
        <section className="commerce-checkout-section">
          <h2>Detail Pesanan</h2>
          <ul className="commerce-checkout-lines">
            {items.map((item) => (
              <li className="commerce-checkout-line" key={lineKey(item)}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{lineDetail(item)}</p>
                </div>
                <b>{formatRupiahLabel(item.price * item.quantity)} <small>× {item.quantity}</small></b>
              </li>
            ))}
          </ul>
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
          {voucherMessage && (voucherFailed
            ? <p className="commerce-voucher-message is-error" role="alert"><AlertCircle size={16} />{voucherMessage}</p>
            : <p className="commerce-voucher-message"><BadgeCheck size={16} />{voucherMessage}</p>)}
        </section>
        <section className="commerce-checkout-section">
          <h2>Pilih Metode Pembayaran</h2>
          <div className="commerce-payment-grid">{payments.map(([label, tone]) => <button key={label} className={`commerce-payment-option ${tone} ${payment === label ? "selected" : ""}`} type="button" aria-pressed={payment === label} onClick={() => setPayment(label)}><span>{label}</span></button>)}</div>
          {/* Baris 50/no. 25: elemen yang ditandai pada dokumentasi memakai warning
              merah muda yang sama dengan validasi di halaman detail pesanan. */}
          {MANUAL_PAYMENTS.includes(payment) && <div className="commerce-field-warning commerce-payment-note" role="alert"><AlertCircle size={15} /><p>Pilih durasi minimal 6 bulan untuk metode bank/alfa.</p></div>}
        </section>
      </div>
      <aside className="commerce-checkout-summary">
        <h2>Rincian Pembayaran</h2>
        <div><span>Subtotal ({totalUnits} item)</span><strong>{formatRupiahLabel(subtotal)}</strong></div>
        <div><span>Jumlah Perangkat</span><strong>{selectedDevice === null ? "Belum dipilih" : `${selectedDevice} Perangkat`}</strong></div>
        <div><span>Metode</span><strong>{payment}</strong></div>
        <div><span>Voucher</span><strong>{voucher.trim() ? voucher.trim().toUpperCase() : "—"}</strong></div>
        <hr />
        <div className="commerce-checkout-total"><span>Total Bayar</span><b>{formatRupiahLabel(subtotal)}</b></div>
        <p className="muted small" style={{ margin: "8px 0 0" }}>Potongan voucher dihitung saat pesanan dibuat.</p>
        <button className="commerce-primary-button" type="button" disabled={payDisabled} onClick={pay}>{submitting ? <LoaderCircle className="commerce-spin" size={20} /> : <LockKeyhole size={20} />}{submitting ? "Memproses…" : "Bayar"}</button>
        {/* Baris 50: gunakan komponen visual warning yang sama dengan detail pesanan. */}
        {manualMethodLocked && <p className="commerce-field-warning commerce-checkout-warning" role="alert"><AlertCircle size={16} />Pilih durasi minimal 6 bulan untuk metode {payment}.</p>}
        <p className="muted small commerce-checkout-consent">Dengan menekan Bayar, Anda menyetujui <Link href="/syarat-ketentuan" target="_blank" rel="noreferrer">syarat &amp; ketentuan</Link> dan <Link href="/kebijakan-privasi" target="_blank" rel="noreferrer">kebijakan privasi</Link> Necly Services.</p>
        {error && <p className="commerce-checkout-error" role="alert"><AlertCircle size={16} />{error}</p>}
        {/* Baris 51: nomor WhatsApp lama tidak terdaftar, jadi arahkan ke halaman laporan kendala + email. */}
        <Link className="commerce-admin-button" href="/laporan-kendala"><LifeBuoy size={22} />Lapor Kendala</Link>
        <a className="commerce-checkout-mailto" href={`mailto:${contact.email}`}><Mail size={15} />{contact.email}</a>
      </aside>
      <aside className="commerce-transaction-trust"><h2>Transaksi Aman & Terpercaya</h2>{safeguards.map(([title, detail, Icon]) => <article key={title}><span><Icon size={25} /></span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</aside>
      <div className="commerce-mobile-payment-bar"><span><small>Total Bayar</small><b>{formatRupiahLabel(subtotal)}</b></span><button type="button" disabled={payDisabled} onClick={pay}>{submitting ? "Memproses…" : "Bayar"}</button></div>
      {needsCatalog && (
        <p className="commerce-checkout-fallback" role="alert">
          <AlertCircle size={16} />
          {items.length === 0
            ? <>Keranjang masih kosong. <Link href="/products">Pilih layanan</Link> dulu sebelum membayar.</>
            : <>{staleCount} item di keranjang berasal dari katalog lama dan tidak bisa diproses. Hapus item itu di <Link href="/cart">keranjang</Link>, lalu tambahkan ulang dari katalog.</>}
        </p>
      )}
    </div>
  );
}
