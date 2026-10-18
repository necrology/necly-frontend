"use client";

import { Check, Clock3, ExternalLink, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatIDR } from "@/lib/money";
import { bootstrapAuth, checkoutApi, DEMO_MODE, type ApiOrder } from "@/lib/api";

interface PaymentClientProps {
  orderId: string;
}

const paidStatuses = new Set(["paid", "fulfilling", "processing", "shipped", "delivered", "completed"]);
const failedStatuses = new Set(["cancelled", "canceled", "expired", "refunded"]);

export function PaymentClient({ orderId }: PaymentClientProps) {
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Kembali dari hosted checkout memuat ulang halaman, sehingga token di
      // memori hilang; pulihkan sesi dari refresh cookie sebelum membaca order.
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi Anda sudah berakhir. Masuk kembali untuk memeriksa pembayaran.");
        return;
      }
      setOrder(await checkoutApi.getOrder(orderId));
    } catch {
      setError("Gagal memuat status pembayaran. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (DEMO_MODE) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadOrder();
    });
    return () => { cancelled = true; };
  }, [loadOrder]);

  // The browser may return before Xendit's webhook reaches the backend. Poll
  // only while payment is pending; the order API remains the source of truth.
  useEffect(() => {
    if (DEMO_MODE || order?.status !== "pending_payment") return;
    const timer = window.setTimeout(() => void loadOrder(), 5000);
    return () => window.clearTimeout(timer);
  }, [loadOrder, order?.status]);

  if (DEMO_MODE) {
    if (demoCompleted) {
      return (
        <div className="card payment-card success-state">
          <span className="success-mark"><Check size={25} /></span>
          <span className="badge status-success">Simulasi selesai</span>
          <h1 className="h2" style={{ fontSize: 28 }}>Pembayaran demo berhasil</h1>
          <p className="muted" style={{ maxWidth: 470, margin: 0 }}>Tidak ada dana yang diproses pada mode demo.</p>
          <Link className="button button-primary" href={`/orders/${orderId}`}>Lihat pesanan</Link>
        </div>
      );
    }

    return (
      <div className="card payment-card">
        <div className="demo-banner"><ShieldCheck size={16} /><span><strong>Pembayaran sandbox.</strong> Jangan memasukkan detail pembayaran nyata.</span></div>
        <div className="summary-lines"><div className="summary-line"><span>Referensi pesanan</span><strong>{orderId}</strong></div><div className="summary-line summary-total"><span>Jumlah demo</span><span className="tabular">{formatIDR(604_750)}</span></div></div>
        <button className="button button-primary" style={{ width: "100%", marginTop: 22 }} type="button" onClick={() => setDemoCompleted(true)}>Simulasikan persetujuan</button>
        <p className="muted" style={{ textAlign: "center", margin: "12px 0 0", fontSize: 9 }}>Tidak ada efek keuangan.</p>
      </div>
    );
  }

  if (loading && !order) {
    return <div className="card payment-card success-state"><RefreshCw className="commerce-spin" size={28} /><h2 className="h3">Memeriksa status pembayaran…</h2></div>;
  }

  if (error && !order) {
    return (
      <div className="card payment-card success-state" style={{ borderColor: "var(--danger)" }}>
        <TriangleAlert size={28} color="var(--danger)" />
        <h1 className="h2" style={{ fontSize: 28 }}>Status pembayaran tidak dapat dimuat</h1>
        <p className="muted" style={{ maxWidth: 470, margin: 0 }}>{error}</p>
        <button className="button button-primary" type="button" onClick={() => void loadOrder()}>Coba lagi</button>
      </div>
    );
  }

  if (!order) return null;

  if (paidStatuses.has(order.status)) {
    return (
      <div className="card payment-card success-state">
        <span className="success-mark"><Check size={25} /></span>
        <span className="badge status-success">Pembayaran dikonfirmasi</span>
        <h1 className="h2" style={{ fontSize: 28 }}>Pembayaran berhasil</h1>
        <p className="muted" style={{ maxWidth: 470, margin: 0 }}>Pesanan {order.number} sudah tercatat dan akan diproses.</p>
        <Link className="button button-primary" href={`/orders/${order.id}`}>Lihat pesanan</Link>
      </div>
    );
  }

  if (failedStatuses.has(order.status)) {
    return (
      <div className="card payment-card success-state" style={{ borderColor: "var(--danger)" }}>
        <TriangleAlert size={28} color="var(--danger)" />
        <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>Pembayaran {order.status}</span>
        <h1 className="h2" style={{ fontSize: 28 }}>Pembayaran tidak dapat dilanjutkan</h1>
        <p className="muted" style={{ maxWidth: 470, margin: 0 }}>Silakan buat pesanan baru atau hubungi tim dukungan jika dana sempat terpotong.</p>
        <Link className="button button-primary" href="/checkout">Kembali ke checkout</Link>
      </div>
    );
  }

  const checkoutURL = order.payments?.find((payment) => payment.status === "pending")?.checkout_url
    ?? order.payments?.at(-1)?.checkout_url;

  return (
    <div className="card payment-card">
      <div className="demo-banner"><ShieldCheck size={16} /><span><strong>Xendit Test Mode.</strong> Transaksi ini menggunakan lingkungan development dan tidak memindahkan uang sungguhan.</span></div>
      <div className="summary-lines">
        <div className="summary-line"><span>Nomor pesanan</span><strong>{order.number}</strong></div>
        <div className="summary-line summary-total"><span>Total pembayaran</span><span className="tabular">{formatIDR(order.total)}</span></div>
      </div>
      <div className="success-state" style={{ paddingTop: 24 }}>
        <Clock3 size={28} />
        <h2 className="h3">Menunggu pembayaran</h2>
        <p className="muted" style={{ maxWidth: 470, margin: 0 }}>Selesaikan pembayaran di Hosted Checkout Xendit. Status halaman ini diperbarui otomatis setelah webhook diterima.</p>
      </div>
      {checkoutURL && <a className="button button-primary" style={{ width: "100%", marginTop: 22 }} href={checkoutURL} rel="noreferrer">Lanjutkan ke Xendit <ExternalLink size={15} /></a>}
      <button className="button" style={{ width: "100%", marginTop: 10 }} type="button" disabled={loading} onClick={() => void loadOrder()}>{loading ? "Memeriksa…" : "Periksa status sekarang"}</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
