"use client";

import { Check, Circle, ClipboardCopy, CreditCard, ExternalLink, KeyRound, LoaderCircle, PackageCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ApiError, bootstrapAuth, checkoutApi, DEMO_MODE, accountOtpApi, type ApiAccountAccessResponse, type ApiOrder, type ApiOTPAccessCode } from "@/lib/api";
import { OrderNumberCopy } from "@/components/order-number-copy";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTimeID, formatIDR } from "@/lib/money";
import { getOrderSteps, normalizeOrderStatus, orderStatusLabel } from "@/lib/order-status";
import { cn } from "@/lib/utils";

interface OrderClientProps {
  orderId: string;
}

type LoadError = {
  kind: "not_found" | "unauthorized" | "generic";
  message: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function MailIcon() {
  return <span aria-hidden="true" className="order-access-mail-icon">@</span>;
}

const paymentStatusLabels: Record<string, string> = {
  pending: "Menunggu",
  paid: "Dibayar",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

const DEMO_ORDER: ApiOrder = {
  id: "demo",
  number: "NCL-DEMO-260906",
  status: "paid",
  subtotal: 500_000,
  discount: 0,
  total: 500_000,
  currency: "IDR",
  payment_due_at: "2026-09-07T10:00:00Z",
  items: [
    {
      id: "item-1",
      product_price_id: "price-1",
      product_name: "Netflix Premium (Demo)",
      duration_name: "1 Bulan",
      unit_price: 186_000,
      quantity: 1,
      device_count: 1,
      line_total: 186_000,
    },
  ],
  created_at: "2026-09-06T10:00:00Z",
  updated_at: "2026-09-06T10:04:00Z",
};

function errorFromFailure(error: unknown): LoadError {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        kind: "unauthorized",
        message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat pesanan ini.",
      };
    }
    // Backend menyembunyikan pesanan milik pengguna lain sebagai 404. Jangan
    // membedakannya di UI supaya keberadaan pesanan tidak bocor.
    if (error.status === 404 || error.status === 403 || error.status === 400) {
      return { kind: "not_found", message: "Pesanan tidak ditemukan atau bukan milik akun Anda." };
    }
  }
  return { kind: "generic", message: "Gagal memuat detail pesanan. Silakan coba lagi." };
}

function OrderClientInner({ orderId }: OrderClientProps) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [access, setAccess] = useState<ApiAccountAccessResponse | null>(null);
  const [accessCodes, setAccessCodes] = useState<Record<string, ApiOTPAccessCode>>({});
  const [accessBusy, setAccessBusy] = useState("");
  const [accessError, setAccessError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (DEMO_MODE) {
      setOrder({ ...DEMO_ORDER, id: orderId, number: `NCL-DEMO-${orderId}` });
      setLoading(false);
      return;
    }

    try {
      // Id pesanan live adalah UUID. Menolak bentuk lain di klien mencegah
      // permintaan yang tidak valid berubah menjadi galat 500 dari database.
      if (!UUID.test(orderId)) {
        setOrder(null);
        setError({ kind: "not_found", message: "Pesanan tidak ditemukan atau bukan milik akun Anda." });
        return;
      }
      // Token akses hanya hidup di memori. Setelah reload atau kembali dari
      // halaman pembayaran, sesi dipulihkan dari refresh cookie sebelum
      // meminta pesanan agar halaman tidak salah menampilkan 401.
      const user = await bootstrapAuth();
      if (!user) {
        setOrder(null);
        setError({ kind: "unauthorized", message: "Masuk untuk melihat pesanan ini." });
        return;
      }
      const data = await checkoutApi.getOrder(orderId);
      setOrder(data);
      // Akses akun hanya ada setelah admin mengirim pesanan. Pesanan yang masih
      // menunggu pembayaran/approval tidak perlu memanggil endpoint ini.
      if (["processing", "shipped", "delivered", "completed"].includes(data.status)) {
        try {
          setAccess(await accountOtpApi.listAccess(orderId));
        } catch {
          setAccess(null);
        }
      } else {
        setAccess(null);
      }
    } catch (failure) {
      setOrder(null);
      setError(errorFromFailure(failure));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadOrder();
    });
    return () => { cancelled = true; };
  }, [loadOrder, reloadToken]);

  const issueAccessCode = async (itemId: string) => {
    if (!order) return;
    setAccessBusy(itemId);
    setAccessError("");
    try {
      const issued = await accountOtpApi.issueCode(order.id, itemId);
      setAccessCodes((current) => ({ ...current, [itemId]: issued }));
    } catch (failure) {
      if (failure instanceof ApiError) {
        const payload = failure.payload as { code?: string } | undefined;
        if (payload?.code === "otp_unavailable") {
          setAccessError("Layanan ambil OTP belum aktif. Hubungi dukungan Necly dengan nomor pesanan ini.");
        } else if (payload?.code === "order_not_approved") {
          setAccessError("Kode akses baru bisa dibuat setelah admin mengirim akun pesanan ini.");
        } else {
          setAccessError(failure.message);
        }
      } else {
        setAccessError("Kode akses gagal dibuat. Coba lagi sebentar lagi.");
      }
    } finally {
      setAccessBusy("");
    }
  };

  const copyAccessCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 2000);
    } catch {
      setAccessError("Kode tidak dapat disalin otomatis. Salin kode yang tampil secara manual.");
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <RefreshCw className="commerce-spin" size={24} style={{ margin: "0 auto 12px", color: "var(--brand)" }} />
        <p className="muted">Memuat pesanan…</p>
      </div>
    );
  }

  if (error) {
    if (error.kind === "not_found") {
      return (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <PackageCheck size={32} style={{ margin: "0 auto 12px", color: "var(--muted)" }} />
          <h1 className="h3">Pesanan tidak ditemukan</h1>
          <p className="muted" style={{ marginTop: 8 }}>{error.message}</p>
          <Link className="button button-primary button-sm" style={{ marginTop: 16 }} href="/products">Kembali ke katalog</Link>
        </div>
      );
    }
    if (error.kind === "unauthorized") {
      return (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <CreditCard size={32} style={{ margin: "0 auto 12px", color: "var(--brand)" }} />
          <h1 className="h3">Masuk untuk melihat pesanan</h1>
          <p className="muted" style={{ marginTop: 8 }}>{error.message}</p>
          <Link className="button button-primary button-sm" style={{ marginTop: 16 }} href={`/login?redirect=/orders/${encodeURIComponent(orderId)}`}>Masuk</Link>
        </div>
      );
    }
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", borderColor: "var(--danger)" }}>
        <PackageCheck size={32} style={{ margin: "0 auto 12px", color: "var(--danger)" }} />
        <h1 className="h3">Tidak dapat memuat pesanan</h1>
        <p className="muted" style={{ marginTop: 8 }}>{error.message}</p>
        <button className="button button-primary button-sm" style={{ marginTop: 16 }} type="button" onClick={() => setReloadToken((value) => value + 1)}>Coba lagi</button>
      </div>
    );
  }

  if (!order) return null;

  const normalizedStatus = normalizeOrderStatus(order.status);
  const steps = normalizedStatus ? getOrderSteps(normalizedStatus) : [];
  const latestPayment = order.payments?.at(-1);
  const pendingPayment = [...(order.payments ?? [])].reverse().find((payment) => payment.status === "pending");
  const updatedAt = order.updated_at || order.created_at;
  const hasAddress = Boolean(order.shipping_address?.trim());
  const hasNotes = Boolean(order.notes?.trim());

  return (
    <>
      <header className="page-hero">
        <div className="container page-hero-row">
          <div>
            <Link className="order-back-link" href="/orders">Semua pesanan</Link>
            <span className="eyebrow">Pelacakan pesanan</span>
            <h1 className="h1 order-detail-title">Detail Pesanan</h1>
            <p className="order-header-number"><span>Nomor Pesanan:</span> <strong>{order.number}</strong></p>
          </div>
          <div className="order-header-meta">
            {DEMO_MODE ? <span className="badge status-info">Pesanan sandbox</span> : <StatusBadge status={order.status} />}
            <span className="muted small">Terakhir diperbarui {updatedAt ? formatDateTimeID(updatedAt) : "—"}</span>
          </div>
        </div>
      </header>
      <div className="container order-layout">
        <div style={{ display: "grid", gap: 15 }}>
          {DEMO_MODE && <div className="demo-banner"><PackageCheck size={16} /><span>Ini adalah status pesanan contoh. Tidak ada layanan yang dibeli dan tidak ada operator yang ditugaskan.</span></div>}
          {!normalizedStatus && <div className="demo-banner" role="alert"><PackageCheck size={16} /><span>Status pesanan tidak dikenali. Hubungi tim dukungan sebelum melanjutkan.</span></div>}
          {(order.status === "cancelled" || order.status === "refunded") && (
            <div className="demo-banner" role="status">
              <PackageCheck size={16} />
              <span>
                Langganan ini sudah dihentikan. Akses akun dan kode OTP untuk pesanan ini tidak berlaku lagi.
                Hubungi dukungan Necly bila Anda memerlukan bantuan lain.
              </span>
            </div>
          )}
          <section className="card" style={{ padding: 27 }}>
            <h2 className="h3">Progres Pesanan</h2>
            {steps.length > 0 ? (
              <div className="order-timeline">
                {steps.map((step) => (
                  <div className={cn("order-step", step.state)} key={step.label}>
                    <span className="order-step-mark">{step.state === "complete" ? <Check size={13} /> : <Circle size={8} fill="currentColor" />}</span>
                    <div>
                      <strong style={{ fontSize: 12 }}>{step.label}</strong>
                      <p className="muted" style={{ margin: "3px 0 0", fontSize: 10 }}>
                        {step.state === "complete" ? "Selesai dan dicatat" : step.state === "current" ? "Tahap saat ini" : step.state === "cancelled" ? "Pesanan tidak akan dilanjutkan" : "Dimulai setelah tahap sebelumnya"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Status pesanan belum dapat dipetakan.</p>
            )}
          </section>
          <section className="card" style={{ padding: 27 }}>
            <h2 className="h3">Detail pembayaran</h2>
            <div className="summary-lines">
              <div className="summary-line"><span>Subtotal</span><strong>{formatIDR(order.subtotal)}</strong></div>
              {order.discount > 0 && <div className="summary-line"><span>Diskon</span><strong style={{ color: "var(--success)" }}>-{formatIDR(order.discount)}</strong></div>}
              <div className="summary-line summary-total"><span>Total</span><strong>{formatIDR(order.total)}</strong></div>
              {order.payment_due_at && <div className="summary-line"><span>Batas pembayaran</span><strong>{formatDateTimeID(order.payment_due_at)}</strong></div>}
            </div>
            {latestPayment && (
              <p className="muted small" style={{ margin: "14px 0 0" }}>
                Pembayaran terakhir: <strong>{paymentStatusLabels[latestPayment.status] ?? orderStatusLabel(latestPayment.status)}</strong> · {formatIDR(latestPayment.amount)}
                {latestPayment.paid_at ? ` · ${formatDateTimeID(latestPayment.paid_at)}` : ""}
              </p>
            )}
            {pendingPayment?.checkout_url && (
              <a className="button button-primary button-sm" style={{ marginTop: 16 }} href={pendingPayment.checkout_url} rel="noreferrer">
                Lanjutkan ke pembayaran <ExternalLink size={14} />
              </a>
            )}
          </section>
          {access && access.items.length > 0 && (
            <section className="card order-access" style={{ padding: 27 }}>
              <h2 className="h3"><KeyRound size={17} aria-hidden="true" /> Akses akun &amp; OTP</h2>
              <p className="muted small" style={{ marginTop: 8 }}>
                Saat platform meminta kode OTP, buat kode akses di bawah lalu gunakan halaman Ambil OTP.
                Kode akses berlaku 15 menit dan tidak sama dengan kata sandi akun.
              </p>
              {!access.otp_inbox_ready && (
                <div className="demo-banner" role="status">
                  <KeyRound size={16} />
                  <span>Layanan ambil OTP belum aktif. Hubungi dukungan Necly dengan menyertakan nomor pesanan.</span>
                </div>
              )}
              {accessError && <p className="otp-alert" role="alert">{accessError}</p>}
              <div className="order-access-list">
                {access.items.map((item) => {
                  const issued = accessCodes[item.order_item_id];
                  // Mailbox pusat bisa aktif sementara akun tertentu tetap tanpa
                  // app password, jadi kesiapan dicek per akun juga.
                  const otpReady = access.otp_inbox_ready && item.otp_ready !== false;
                  return (
                    <div className="order-access-row" key={`${item.order_item_id}-${item.account_email}`}>
                      <div>
                        <strong>{item.product_name}</strong>
                        <p className="muted small" style={{ margin: "3px 0 0" }}>
                          {item.account_label} · {item.duration_name}
                        </p>
                        <p className="order-access-email"><MailIcon /> {item.account_email}</p>
                      </div>
                      {issued ? (
                        <div className="order-access-code">
                          <code>{issued.code}</code>
                          <span className="muted small">Berlaku sampai {formatDateTimeID(issued.expires_at)}</span>
                          <div className="order-access-actions">
                            <button className="button button-secondary button-sm" type="button" onClick={() => copyAccessCode(issued.code)}>
                              {copiedCode === issued.code ? <><Check size={14} /> Tersalin</> : <><ClipboardCopy size={14} /> Salin kode</>}
                            </button>
                            <Link
                              className="button button-primary button-sm"
                              href={`/otp?email=${encodeURIComponent(item.account_email)}&code=${encodeURIComponent(issued.code)}`}
                            >
                              Ambil OTP
                            </Link>
                          </div>
                          <span className="muted small">
                            {issued.email_sent ? "Kode akses juga dikirim ke email akun Necly Anda." : "Kode akses tampil di sini; email kode tidak terkirim."}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          {!otpReady && (
                            <span className="otp-alert" role="status">
                              Layanan OTP untuk akun ini belum disiapkan. Hubungi dukungan Necly dengan menyertakan nomor pesanan.
                            </span>
                          )}
                          <button
                            className="button button-primary button-sm"
                            type="button"
                            disabled={!otpReady || accessBusy === item.order_item_id}
                            onClick={() => issueAccessCode(item.order_item_id)}
                          >
                            {accessBusy === item.order_item_id ? "Membuat kode…" : "Buat kode akses OTP"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <section className="card order-items-card" style={{ padding: 27 }}>
            <h2 className="h3">Item Pesanan</h2>
            <div className="order-items-list">
              {(order.items ?? []).map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{item.product_name}</strong>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: 11 }}>
                      {item.duration_name} × {item.quantity}
                      {item.device_count ? ` · ${item.device_count} perangkat` : ""}
                    </p>
                  </div>
                  <span className="tabular" style={{ fontSize: 13 }}>{formatIDR(item.line_total ?? item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside style={{ display: "grid", alignSelf: "start", gap: 15 }}>
          {(hasAddress || hasNotes) && (
            <section className="card" style={{ padding: 22 }}>
              <h2 className="h3">Detail tambahan</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {hasAddress && <span className="muted small">{order.shipping_address}</span>}
                {hasNotes && <span className="muted small">{order.notes}</span>}
              </div>
            </section>
          )}
          <section className="card order-help-card" style={{ padding: 22 }}>
            <h2 className="h3">Butuh Bantuan?</h2>
            <p className="muted small">Salin nomor pesanan saat menghubungi tim dukungan Necly atau membuat laporan.</p>
            <OrderNumberCopy className="order-help-copy" number={order.number} />
            <Link className="button button-warning button-sm order-help-report" href="/laporan-kendala">Laporkan kendala</Link>
          </section>
        </aside>
      </div>
    </>
  );
}

export function OrderClient({ orderId }: OrderClientProps) {
  return (
    <Suspense fallback={<div className="card" style={{ padding: 40, textAlign: "center" }}><LoaderCircle className="commerce-spin" size={24} style={{ margin: "0 auto 12px" }} /><p className="muted">Memuat pesanan…</p></div>}>
      <OrderClientInner orderId={orderId} />
    </Suspense>
  );
}
