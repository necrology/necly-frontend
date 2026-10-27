"use client";

import { AlertCircle, BadgeCheck, ChevronRight, CircleDollarSign, CreditCard, Headphones, LifeBuoy, LoaderCircle, Mail, ShieldCheck, UsersRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { contact } from "@/data/contact";
import { defaultDeviceOptions } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { productCategoryLabel } from "@/lib/product-category";
import { continueToCheckout } from "@/lib/checkout-navigation";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { ApiError, apiErrorCode, apiErrorNumber, bootstrapAuth, catalogApi, checkoutApi, DEMO_MODE, useAuthStore } from "@/lib/api";
import { reconcileCartItems } from "@/lib/cart-reconciliation";
import { PAYMENT_METHODS, paymentChannelForLabel } from "@/lib/payment-channels";

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
  return parts.length ? parts.join(" · ") : productCategoryLabel(item);
}

/**
 * Keranjang menyimpan label durasi apa adanya dari katalog, dan dua sumbernya
 * memakai satuan berbeda: data contoh menulis "6 Bulan" sementara katalog API
 * menulis "180 hari" (lihat product-mapper). Keduanya harus dibaca sebagai
 * jumlah bulan — tanpa konversi ini "180 hari" terbaca 180 bulan, sehingga
 * paket 1 bulan lolos ke metode bank/retail yang seharusnya terkunci.
 */
function durationInMonths(label?: string) {
  const match = /(\d+)\s*(bulan|hari|days?|months?)/i.exec(label ?? "");
  if (!match) return 1;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return /bulan|month/i.test(match[2]) ? value : Math.max(1, Math.round(value / 30));
}

type PriceReview = {
  previousSubtotal: number;
  subtotal: number;
};

type ReviewedPrice = {
  subtotal: number;
  /** Persetujuan hanya berlaku untuk isi keranjang/kanal yang sama. */
  fingerprint: string;
};

export function CheckoutCommerceClient() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const replaceItems = useCartStore((state) => state.replaceItems);
  const [payment, setPayment] = useState("QRIS");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucher, setVoucher] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherFailed, setVoucherFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unsupportedChannel, setUnsupportedChannel] = useState<string | null>(null);
  const [priceReview, setPriceReview] = useState<PriceReview | null>(null);
  const [reviewedPrice, setReviewedPrice] = useState<ReviewedPrice | null>(null);
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  // Baris 38 & 39: jumlah perangkat wajib dipilih. Bila pembeli sudah memilihnya
  // di halaman detail, pilihannya ikut dari keranjang.
  const [device, setDevice] = useState<number | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);

  // Pilihan perangkat tidak lagi diambil dari data contoh. Nilai yang tersedia
  // adalah pilihan yang memang dibawa item keranjang plus bawaan satu perangkat.
  const deviceOptions = useMemo(() => {
    const values = new Set<number>(defaultDeviceOptions);
    for (const item of items) {
      if (item.selectedDevice && item.selectedDevice > 0) values.add(item.selectedDevice);
    }
    return [...values].sort((left, right) => left - right);
  }, [items]);
  const selectedDevice = device ?? items[0]?.selectedDevice ?? null;

  // Seluruh angka di halaman ini berasal dari keranjang. Total yang ditampilkan
  // juga dikirim sebagai expected_subtotal supaya backend menolak percobaan bayar
  // bila harga berubah di antara tampilan dan permintaan.
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  // Durasi ditentukan di keranjang, bukan di sini: pesanan dibangun dari id harga
  // yang tersimpan di keranjang. Aturan bank/retail karena itu mengikuti durasi
  // yang benar-benar dipesan, bukan pilihan di halaman ini. Bila keranjang memuat
  // beberapa durasi, yang terpendek yang menentukan.
  const months = useMemo(
    () => (items.length ? Math.min(...items.map((item) => durationInMonths(item.selectedDuration))) : 1),
    [items],
  );
  const manualMethodLocked = MANUAL_PAYMENTS.includes(payment) && months < 6;

  // Keranjang bisa memuat id harga dari data contoh lokal — produk yang
  // ditambahkan sebelum katalog dari API selesai dimuat. Id seperti itu tidak ada
  // di database; checkout akan merekonsiliasinya dengan katalog lebih dulu.
  const staleCount = items.filter((item) => !UUID.test(item.product_price_id ?? "")).length;
  const payDisabled = submitting || items.length === 0 || priceReview !== null;

  // Satu kunci untuk satu kombinasi keranjang/voucher/kanal. Retry setelah
  // gangguan jaringan memakai kunci yang sama sehingga backend mengembalikan
  // hasil tersimpan, bukan membuat pesanan kedua. Mengubah isi atau kanal
  // membuat kunci baru karena fingerprint-nya berubah.
  const idempotencyKey = useRef(generateIdempotencyKey());
  const lastFingerprint = useRef("");
  const attemptFingerprint = useMemo(() => JSON.stringify({
    items: items
      .map((item) => ({ price: item.product_price_id ?? item.id, quantity: item.quantity, device: item.selectedDevice ?? selectedDevice }))
      .sort((left, right) => left.price.localeCompare(right.price) || String(left.device).localeCompare(String(right.device))),
    voucher: voucher.trim().toUpperCase(),
    channel: paymentChannelForLabel(payment) ?? "unsupported",
  }), [items, payment, selectedDevice, voucher]);
  useEffect(() => {
    if (lastFingerprint.current === attemptFingerprint) return;
    lastFingerprint.current = attemptFingerprint;
    idempotencyKey.current = generateIdempotencyKey();
  }, [attemptFingerprint]);

  // Persetujuan terikat pada fingerprint. Jika isi keranjang, voucher, atau
  // kanal berubah, persetujuan lama tidak boleh dipakai lagi.
  const currentApproval = reviewedPrice?.fingerprint === attemptFingerprint ? reviewedPrice.subtotal : null;
  const approvedSubtotal = currentApproval ?? subtotal;
  const priceAdjustment = approvedSubtotal - subtotal;

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

  const approvePriceReview = () => {
    if (!priceReview) return;
    setReviewedPrice({ subtotal: priceReview.subtotal, fingerprint: attemptFingerprint });
    setPriceReview(null);
    setError("");
  };

  const pay = async () => {
    setError("");
    setStockNotice(null);
    setUnsupportedChannel(null);
    if (selectedDevice === null) {
      setShowWarnings(true);
      return;
    }
    if (priceReview) return;
    const channel = paymentChannelForLabel(payment);
    if (!channel) {
      setError(`Metode ${payment} tidak dikenal. Pilih metode pembayaran lain.`);
      return;
    }
    setSubmitting(true);

    let liveSubtotal = subtotal;
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

      // Rekonsiliasi selalu dijalankan sebelum pembayaran, bukan hanya untuk id
      // lama: harga dan stok bisa berubah sejak produk dimasukkan ke keranjang.
      const catalog = await catalogApi.listProducts({ per_page: 100 });
      const reconciled = reconcileCartItems(items, catalog.products);
      liveSubtotal = reconciled.currentSubtotal;

      if (reconciled.unresolved > 0) {
        const exceeded = reconciled.issues.filter((issue) => issue.reason === "stock_exceeded").length;
        setStockNotice(
          exceeded > 0
            ? `Jumlah yang diminta melebihi stok tersedia untuk ${exceeded} baris. Kurangi jumlah atau hapus item duplikat sebelum membayar.`
            : `${reconciled.unresolved} item tidak lagi tersedia dengan paket yang sama. Hapus item tersebut dari keranjang lalu pilih paket yang tersedia.`,
        );
        return;
      }

      const needsApproval = reconciled.issues.some(
        (issue) => issue.reason === "price_changed" || issue.reason === "quantity_adjusted",
      );
      if (needsApproval && currentApproval !== liveSubtotal) {
        replaceItems(reconciled.items);
        setPriceReview({ previousSubtotal: reconciled.previousSubtotal, subtotal: liveSubtotal });
        setReviewedPrice(null);
        return;
      }

      const payableItems = reconciled.items;
      if (reconciled.changed) replaceItems(payableItems);

      // Keranjang bisa memuat dua baris dengan harga yang sama — mis. ditambahkan
      // dari halaman katalog lalu dari halaman detail. Backend menolak item
      // duplikat dalam satu pesanan, jadi baris seperti itu digabung lebih dulu,
      // dengan jumlah dijumlahkan sesuai yang terlihat di keranjang.
      const merged = new Map<string, { product_price_id: string; quantity: number; device_count?: number }>();
      for (const item of payableItems) {
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
        {
          voucher_code: voucher.trim().toUpperCase() || undefined,
          items: [...merged.values()],
          expected_subtotal: currentApproval ?? liveSubtotal,
          payment_channel: channel,
        },
        idempotencyKey.current,
      );
      continueToCheckout(response, router.push);
    } catch (err) {
      const code = apiErrorCode(err);

      // Server melihat harga yang berbeda dari yang disetujui pembeli. Tampilkan
      // konflik yang bisa ditinjau, bukan langsung menagih jumlah baru.
      if (code === "price_changed") {
        const current = apiErrorNumber(err, "current_subtotal");
        if (current !== null) {
          setPriceReview({ previousSubtotal: approvedSubtotal, subtotal: current });
          setReviewedPrice(null);
          setError("");
          return;
        }
      }

      if (code === "unsupported_payment_channel" || code === "payment_channel_not_eligible") {
        setUnsupportedChannel(payment);
        setError(`Metode ${payment} tidak didukung oleh penyedia pembayaran untuk pesanan ini. Pilih metode lain; pilihan Anda tidak diganti otomatis.`);
        return;
      }

      if (code === "out_of_stock") {
        setStockNotice("Stok paket yang dipilih sudah habis. Perbarui keranjang lalu pilih paket yang masih tersedia.");
        setError("Stok paket yang dipilih sudah habis.");
        return;
      }

      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Checkout gagal. Coba lagi.";
      // Backend menolak kode voucher yang tidak dikenal pada saat pesanan dibuat;
      // tampilkan sebagai masalah voucher supaya jelas bagi pembeli.
      if (/voucher/i.test(message)) {
        setVoucherFailed(true);
        setVoucherMessage("Kode Voucher Tidak dikenali");
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="commerce-checkout-layout">
      <div className="commerce-checkout-content">
        <section className="commerce-checkout-section commerce-duration-section">
          <h2>Durasi Berlangganan</h2>
          <div className="commerce-checkout-duration-chips">
            {items.map((item, index) => <span key={`${lineKey(item)}-${index}`}>{item.selectedDuration ?? "1 Bulan"}</span>)}
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
            {items.map((item, index) => (
              <li className="commerce-checkout-line" key={`${lineKey(item)}-${index}`}>
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
          <div className="commerce-payment-grid">{PAYMENT_METHODS.map(({ label, tone }) => <button key={label} className={`commerce-payment-option ${tone} ${payment === label ? "selected" : ""} ${unsupportedChannel === label ? "is-unsupported" : ""}`} type="button" aria-pressed={payment === label} onClick={() => { setPayment(label); setUnsupportedChannel(null); setError(""); }}><span>{label}</span></button>)}</div>
          {/* Baris 50/no. 25: elemen yang ditandai pada dokumentasi memakai warning
              merah muda yang sama dengan validasi di halaman detail pesanan. */}
          {MANUAL_PAYMENTS.includes(payment) && <div className="commerce-field-warning commerce-payment-note" role="alert"><AlertCircle size={15} /><p>Pilih durasi minimal 6 bulan untuk metode bank/alfa.</p></div>}
          {unsupportedChannel && <p className="commerce-field-warning" role="alert"><AlertCircle size={15} />Penyedia pembayaran tidak mendukung metode {unsupportedChannel} untuk pesanan ini. Pilih metode lain.</p>}
        </section>
      </div>
      <aside className="commerce-checkout-summary">
        <h2>Rincian Pembayaran</h2>
        <div><span>Subtotal ({totalUnits} item)</span><strong>{formatRupiahLabel(subtotal)}</strong></div>
        <div><span>Jumlah Perangkat</span><strong>{selectedDevice === null ? "Belum dipilih" : `${selectedDevice} Perangkat`}</strong></div>
        <div><span>Metode</span><strong>{payment}</strong></div>
        <div><span>Voucher</span><strong>{voucher.trim() ? voucher.trim().toUpperCase() : "—"}</strong></div>
        {priceAdjustment !== 0 && <div><span>Penyesuaian harga server</span><strong>{priceAdjustment > 0 ? "+" : ""}{formatRupiahLabel(priceAdjustment)}</strong></div>}
        <hr />
        <div className="commerce-checkout-total"><span>Total Bayar</span><b>{formatRupiahLabel(approvedSubtotal)}</b></div>
        <p className="muted small" style={{ margin: "8px 0 0" }}>Potongan voucher dihitung saat pesanan dibuat.</p>
        {priceReview && (
          <div className="commerce-field-warning commerce-checkout-warning" role="alert">
            <AlertCircle size={16} />
            <div>
              <p style={{ margin: 0 }}>Harga atau stok berubah sebelum pembayaran. Total sebelumnya {formatRupiahLabel(priceReview.previousSubtotal)}, total terbaru {formatRupiahLabel(priceReview.subtotal)}.</p>
              <button className="button button-secondary button-sm" style={{ marginTop: 10 }} type="button" onClick={approvePriceReview}>Setujui total baru</button>
            </div>
          </div>
        )}
        <button className="commerce-primary-button" type="button" disabled={payDisabled} onClick={pay}>{submitting ? <LoaderCircle className="commerce-spin" size={20} /> : <CreditCard size={20} />}{submitting ? "Memproses…" : priceReview ? "Tinjau total baru" : "Bayar"}</button>
        {/* Baris 50: gunakan komponen visual warning yang sama dengan detail pesanan. */}
        {manualMethodLocked && <p className="commerce-field-warning commerce-checkout-warning" role="alert"><AlertCircle size={16} />Pilih durasi minimal 6 bulan untuk metode {payment}. Anda tetap dapat melanjutkan dan memilih kanal pembayaran yang tersedia di Xendit.</p>}
        {/* Alasan tombol Bayar mati ditaruh tepat di bawah tombolnya: sebelumnya
            keterangan ini hanya ada di ujung halaman, sehingga tombol tampak
            terkunci tanpa sebab. */}
        {!submitting && (items.length === 0 || staleCount > 0) && (
          <p className="commerce-field-warning commerce-checkout-warning" role="status"><AlertCircle size={16} />{items.length === 0 ? "Keranjang masih kosong, jadi belum ada yang bisa dibayar." : `${staleCount} item di keranjang berasal dari katalog lama dan akan diperbarui otomatis saat Anda membayar.`}</p>
        )}
        {stockNotice && <p className="commerce-checkout-error" role="alert"><AlertCircle size={16} />{stockNotice}</p>}
        <p className="muted small commerce-checkout-consent">Dengan menekan Bayar, Anda menyetujui <Link href="/syarat-ketentuan" target="_blank" rel="noreferrer">syarat &amp; ketentuan</Link> dan <Link href="/kebijakan-privasi" target="_blank" rel="noreferrer">kebijakan privasi</Link> Necly Services.</p>
        {error && <p className="commerce-checkout-error" role="alert"><AlertCircle size={16} />{error}</p>}
        {/* Baris 51: nomor WhatsApp lama tidak terdaftar, jadi arahkan ke halaman laporan kendala + email. */}
        <Link className="commerce-admin-button" href="/laporan-kendala"><LifeBuoy size={22} />Lapor Kendala</Link>
        <a className="commerce-checkout-mailto" href={`mailto:${contact.email}`}><Mail size={15} />{contact.email}</a>
      </aside>
      <aside className="commerce-transaction-trust"><h2>Transaksi Aman & Terpercaya</h2>{safeguards.map(([title, detail, Icon]) => <article key={title}><span><Icon size={25} /></span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</aside>
      <div className="commerce-mobile-payment-bar"><span><small>Total Bayar</small><b>{formatRupiahLabel(approvedSubtotal)}</b></span><button type="button" disabled={payDisabled} onClick={pay}>{submitting ? "Memproses…" : priceReview ? "Tinjau total" : "Bayar"}</button></div>
      {(items.length === 0 || staleCount > 0) && (
        <p className="commerce-checkout-fallback" role="alert">
          <AlertCircle size={16} />
          {items.length === 0
            ? <>Keranjang masih kosong. <Link href="/products">Pilih layanan</Link> dulu sebelum membayar.</>
            : <>{staleCount} item di keranjang berasal dari katalog lama. Data paket akan diperbarui otomatis dari katalog saat Anda menekan Bayar.</>}
        </p>
      )}
    </div>
  );
}
