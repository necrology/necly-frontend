"use client";

import { Check, CreditCard, Landmark, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatIDR } from "@/lib/money";
import { checkoutApi, DEMO_MODE } from "@/lib/api";

const methods = [
  { id: "va", label: "Virtual account", detail: "BCA, BNI, BRI, atau Mandiri sandbox", Icon: Landmark },
  { id: "qris", label: "QRIS", detail: "Simulasi konfirmasi QR", Icon: QrCode },
  { id: "card", label: "Kartu", detail: "Nomor kartu tidak dikumpulkan", Icon: CreditCard },
  { id: "wallet", label: "Dompet digital", detail: "Simulasi persetujuan mobile", Icon: Smartphone },
];

interface PaymentClientProps {
  orderId: string;
}

export function PaymentClient({ orderId }: PaymentClientProps) {
  const [method, setMethod] = useState("va");
  const [simulated, setSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<{ number: string; total: number; status: string; items: Array<{ product_name: string; quantity: number; unit_price: number }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (DEMO_MODE) {
      setSimulated(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const order = await checkoutApi.getOrder(orderId);
      setOrderData({
        number: order.number,
        total: order.total,
        status: order.status,
        items: order.items.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      setSimulated(true);
    } catch {
      setError("Gagal memuat detail pesanan. Silakan coba lagi.");
      setSimulated(true);
    } finally {
      setLoading(false);
    }
  };

  // Demo mode: show success state immediately without API call
  if (DEMO_MODE && simulated) return (
    <div className="card payment-card success-state">
      <span className="success-mark"><Check size={25} /></span>
      <span className="badge status-success">Diarahkan ke pembayaran</span>
      <h1 className="h2" style={{ fontSize: 28 }}>Mengarahkan ke penyedia pembayaran…</h1>
      <p className="muted" style={{ maxWidth: 470, margin: 0 }}>Jika tidak diarahkan otomatis, klik tautan di bawah.</p>
      <Link className="button button-primary" href={`/orders/${orderId}`}>Buka tautan pembayaran</Link>
    </div>
  );

  // Live mode: show success state after API call succeeds
  if (!DEMO_MODE && simulated && orderData) return (
    <div className="card payment-card success-state">
      <span className="success-mark"><Check size={25} /></span>
      <span className="badge status-success">Diarahkan ke pembayaran</span>
      <h1 className="h2" style={{ fontSize: 28 }}>Mengarahkan ke penyedia pembayaran…</h1>
      <p className="muted" style={{ maxWidth: 470, margin: 0 }}>Jika tidak diarahkan otomatis, klik tautan di bawah.</p>
      <Link className="button button-primary" href={`/orders/${orderId}`}>Buka tautan pembayaran</Link>
    </div>
  );

  // Error state (both modes)
  if (simulated && error) return (
    <div className="card payment-card" style={{ borderColor: "var(--danger)" }}>
      <span className="success-mark" style={{ color: "var(--danger)" }}><Check size={25} /></span>
      <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>Kesalahan</span>
      <h1 className="h2" style={{ fontSize: 28 }}>Tidak dapat memproses pembayaran</h1>
      <p className="muted" style={{ maxWidth: 470, margin: 0 }}>{error}</p>
      <button className="button button-primary" onClick={() => { setSimulated(false); setError(null); }}>Coba lagi</button>
    </div>
  );

  // Initial state: show payment method selection form
  return (
    <div className="card payment-card">
      <div className="demo-banner"><ShieldCheck size={16} /><span><strong>{DEMO_MODE ? "Pembayaran sandbox." : "Pembayaran terintegrasi."}</strong> {DEMO_MODE ? "Jangan memasukkan detail pembayaran nyata. Memilih metode hanya mengubah antarmuka demo ini." : "Anda akan diarahkan ke halaman penyedia pembayaran yang aman."}</span></div>
      <div className="summary-lines"><div className="summary-line"><span>Referensi pesanan</span><strong>{orderId}</strong></div><div className="summary-line summary-total"><span>Jumlah demo</span><span className="tabular">{formatIDR(604_750)}</span></div></div>
      <h2 className="h3" style={{ margin: "26px 0 13px" }}>Pilih metode {DEMO_MODE ? "simulasi" : "pembayaran"}</h2>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr-only">Metode pembayaran</legend>{methods.map(({ id, label, detail, Icon }) => <label className={`payment-option ${method === id ? "selected" : ""}`} key={id}><input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} /><span><strong style={{ display: "block", fontSize: 12 }}>{label}</strong><span className="muted" style={{ fontSize: 10 }}>{detail}</span></span><Icon size={17} className="muted" /></label>)}</fieldset>
      <button className="button button-primary" style={{ width: "100%", marginTop: 22 }} type="button" onClick={handleSimulate} disabled={loading}>{loading ? "Memproses…" : DEMO_MODE ? "Simulasikan persetujuan" : "Lanjutkan ke pembayaran"}</button>
      <p className="muted" style={{ textAlign: "center", margin: "12px 0 0", fontSize: 9 }}>{DEMO_MODE ? "Tindakan ini dapat dibatalkan dengan me-refresh halaman. Tidak ada efek keuangan." : "Anda akan diarahkan ke halaman penyedia pembayaran yang aman."}</p>
    </div>
  );
}