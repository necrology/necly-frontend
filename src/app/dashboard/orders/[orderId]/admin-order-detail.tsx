"use client";

import { AlertTriangle, ArrowLeft, CreditCard, MailCheck, PackageCheck, RefreshCw, RotateCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  ApiError,
  adminApi,
  apiErrorCode,
  bootstrapAuth,
  DEMO_MODE,
  type ApiDeliveryItemOptions,
  type ApiOrder,
  type ApiOrderDelivery,
} from "@/lib/api";
import { formatDateTimeWIB, formatIDR } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import {
  deliveryErrorGuidanceFor,
  deliveryNeedsReplacement,
  describeDeliveryFailure,
  remainingAccessLabel,
  replacementStatusLabel,
  replacementStatusTone,
  summarizeDeliveries,
  summarizeOrderPayment,
} from "@/lib/order-delivery";
import { dashboardOrders } from "@/data/seed";
import { DeliveryAccountPicker, ReplaceAccountPanel } from "./delivery-picker";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadError = {
  kind: "not_found" | "forbidden" | "unauthorized" | "generic";
  message: string;
};

const deliveryStatusLabels: Record<ApiOrderDelivery["status"], string> = {
  pending: "Menunggu",
  sending: "Sedang dikirim",
  sent: "Terkirim",
  failed: "Gagal",
};

const deliveryStatusTone: Record<ApiOrderDelivery["status"], string> = {
  pending: "status-warning",
  sending: "status-info",
  sent: "status-success",
  failed: "status-danger",
};

function describeDeliveryError(error: unknown) {
  if (error instanceof ApiError) {
    const code = apiErrorCode(error);
    const guidance = deliveryErrorGuidanceFor(code);
    if (guidance) return `${guidance.label} (${code}). ${guidance.action}`;
    const mapped = describeDeliveryFailure(error, "Periksa status pesanan lalu coba lagi.");
    if (error.status === 503) return "Fitur pengiriman akun belum dikonfigurasi di server.";
    if (error.status === 403) return "Hanya admin yang dapat mengirim akun.";
    if (error.status === 404) return error.message || "Pesanan atau pengiriman tidak ditemukan.";
    return `${mapped.message} ${mapped.guidance}`.trim();
  }
  return "Gagal memproses pengiriman akun. Silakan coba lagi.";
}

function accountReference(id?: string | null, labels?: Map<string, string>) {
  if (!id) return "—";
  return labels?.get(id) ?? `Akun ${id.slice(0, 8)}`;
}

function demoOrder(orderId: string): ApiOrder {
  const demo = dashboardOrders.find((item) => item.id === orderId) ?? dashboardOrders[0];
  const statusMap: Record<string, string> = {
    "Menunggu pembayaran": "pending_payment",
    Dibayar: "paid",
    Diproses: "processing",
    Aktif: "delivered",
    Dibatalkan: "cancelled",
  };

  return {
    id: demo.id,
    number: demo.id,
    status: statusMap[demo.status] ?? "pending_payment",
    subtotal: demo.amount,
    discount: 0,
    total: demo.amount,
    currency: "IDR",
    payment_due_at: "",
    items: [{
      id: `${demo.id}-item`,
      product_price_id: `${demo.id}-price`,
      product_name: demo.service,
      duration_name: demo.duration,
      unit_price: demo.amount,
      quantity: 1,
      device_count: 1,
      line_total: demo.amount,
    }],
    payments: [],
    customer: { id: demo.customerEmail, name: demo.customer, email: demo.customerEmail },
    created_at: "",
    updated_at: "",
  };
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItems, setPickerItems] = useState<ApiDeliveryItemOptions[]>([]);
  const [pickerSelection, setPickerSelection] = useState<Record<string, string>>({});
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerSubmitting, setPickerSubmitting] = useState(false);
  const [replaceDelivery, setReplaceDelivery] = useState<ApiOrderDelivery | null>(null);
  const [replaceItem, setReplaceItem] = useState<ApiDeliveryItemOptions | null>(null);
  const [replaceSelection, setReplaceSelection] = useState("");
  const [replaceReason, setReplaceReason] = useState("");
  const [replaceComplaint, setReplaceComplaint] = useState(false);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (DEMO_MODE) {
      setOrder(demoOrder(orderId));
      setLoading(false);
      return;
    }

    try {
      const user = await bootstrapAuth();
      if (!user) {
        setOrder(null);
        setError({ kind: "unauthorized", message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat pesanan ini." });
        return;
      }
      if (user.role !== "admin") {
        // Pertahanan berlapis: guard layout sudah menolak penjual, dan route
        // ini tidak boleh meminta data admin untuk peran selain admin.
        setOrder(null);
        setError({ kind: "forbidden", message: "Halaman detail pesanan hanya untuk admin." });
        return;
      }
      if (!UUID.test(orderId)) {
        setOrder(null);
        setError({ kind: "not_found", message: "Pesanan tidak ditemukan." });
        return;
      }

      setOrder(await adminApi.getOrder(orderId));
    } catch (failure) {
      setOrder(null);
      if (failure instanceof ApiError) {
        if (failure.status === 403) {
          setError({ kind: "forbidden", message: "Halaman detail pesanan hanya untuk admin." });
        } else if (failure.status === 404 || failure.status === 400) {
          setError({ kind: "not_found", message: "Pesanan tidak ditemukan." });
        } else if (failure.status === 401) {
          setError({ kind: "unauthorized", message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat pesanan ini." });
        } else {
          setError({ kind: "generic", message: "Gagal memuat detail pesanan. Silakan coba lagi." });
        }
      } else {
        setError({ kind: "generic", message: "Gagal memuat detail pesanan. Silakan coba lagi." });
      }
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

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <RefreshCw className="commerce-spin" size={24} style={{ margin: "0 auto 12px", color: "var(--brand)" }} />
          <p className="muted">Memuat detail pesanan…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    const title = error?.kind === "not_found"
      ? "Pesanan tidak ditemukan"
      : error?.kind === "forbidden"
        ? "Akses ditolak"
        : error?.kind === "unauthorized"
          ? "Sesi tidak valid"
          : "Tidak dapat memuat pesanan";
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 420 }} role="alert">
          <PackageCheck size={30} style={{ margin: "0 auto 12px", color: "var(--muted)" }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{error?.message}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="button button-secondary button-sm" href="/dashboard/orders">
              <ArrowLeft size={13} /> Kembali ke pesanan
            </Link>
            {error?.kind !== "not_found" && error?.kind !== "forbidden" && (
              <button className="button button-primary button-sm" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                Coba lagi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const payments = order.payments ?? [];
  const items = order.items ?? [];
  const deliveries = order.deliveries ?? [];
  const itemNameById = new Map(items.map((item) => [item.id, item.product_name]));
  const paymentSummary = summarizeOrderPayment(order);
  const deliverySummary = summarizeDeliveries(deliveries);
  const replacementHistory = deliveries.flatMap((delivery) =>
    (delivery.replacements ?? []).map((replacement) => ({ ...replacement, delivery })),
  );
  const accountLabels = new Map(
    deliveries.flatMap((delivery) =>
      (delivery.assigned_accounts ?? []).map((account) => [account.inventory_account_id, account.label] as const),
    ),
  );
  const approvable = order.status === "paid" || order.status === "fulfilling";
  const alreadyApproved = ["processing", "shipped", "delivered", "completed"].includes(order.status);
  const hasUnsent = deliveries.length === 0 || deliveries.some((delivery) => delivery.status !== "sent");
  const canSend = !DEMO_MODE && (approvable || (alreadyApproved && hasUnsent));
  const sendLabel = approvable ? "Setujui & kirim akun" : "Kirim akun";

  const openSendPicker = async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    setPickerError(null);
    setPickerItems([]);
    setPickerSelection({});
    setActionError("");
    setActionNotice("");
    try {
      const response = await adminApi.getOrderDeliveryOptions(order.id);
      setPickerItems(response.items);
      const initial: Record<string, string> = {};
      response.items.forEach((item) => {
        const current = item.accounts.find((account) => account.assigned_to_item && account.can_assign && !account.used_by_customer);
        const eligible = current ?? item.accounts.find((account) => account.can_assign && !account.used_by_customer);
        if (eligible) initial[item.order_item_id] = eligible.inventory_account_id;
      });
      setPickerSelection(initial);
    } catch (failure) {
      setPickerError(describeDeliveryError(failure));
    } finally {
      setPickerLoading(false);
    }
  };

  const confirmSend = async () => {
    const unsentItems = pickerItems.filter((item) => deliveries.find((delivery) => delivery.id === item.delivery_id)?.status !== "sent");
    if (unsentItems.length === 0) return;
    setPickerSubmitting(true);
    setActionError("");
    setActionNotice("");
    try {
      for (const item of unsentItems) {
        const accountId = pickerSelection[item.order_item_id];
        if (!accountId) throw new Error(`Akun untuk ${item.product_name} belum dipilih.`);
        if (!item.assigned_account_ids.includes(accountId)) {
          await adminApi.assignOrderDeliveryAccount(order.id, item.delivery_id, accountId);
        }
      }

      let retryFailure: unknown = null;
      if (approvable) {
        await adminApi.approveOrderDelivery(order.id);
      } else {
        for (const item of unsentItems) {
          const delivery = deliveries.find((row) => row.id === item.delivery_id);
          if (delivery?.status === "sent") continue;
          try {
            await adminApi.retryOrderDelivery(order.id, item.delivery_id);
          } catch (failure) {
            retryFailure ??= failure;
          }
        }
      }

      const updated = await adminApi.getOrder(order.id);
      setOrder(updated);
      setPickerOpen(false);
      const sent = (updated.deliveries ?? []).filter((delivery) => delivery.status === "sent").length;
      const failed = (updated.deliveries ?? []).filter((delivery) => delivery.status === "failed").length;
      setActionNotice(
        `${sent} dari ${(updated.deliveries ?? []).length} item terkirim ke email pembeli terverifikasi.` +
          (failed > 0 ? ` ${failed} item masih gagal; periksa kode kesalahan di bawah.` : ""),
      );
      if (retryFailure) setActionError(describeDeliveryError(retryFailure));
    } catch (failure) {
      setActionError(describeDeliveryError(failure));
      try {
        setOrder(await adminApi.getOrder(order.id));
      } catch {
        // Pesan aksi tetap ditampilkan walau penyegaran data ikut gagal.
      }
    } finally {
      setPickerSubmitting(false);
    }
  };

  const retryDelivery = async (delivery: ApiOrderDelivery) => {
    setRetryingId(delivery.id);
    setActionError("");
    setActionNotice("");
    try {
      const result = await adminApi.retryOrderDelivery(order.id, delivery.id);
      setOrder(await adminApi.getOrder(order.id));
      setActionNotice(
        result.delivery.status === "sent"
          ? "Pengiriman berhasil diulang. Email tidak dikirim dua kali bila status sudah sent."
          : "Pengiriman diulang, tetapi masih gagal. Periksa kode kesalahan di bawah.",
      );
    } catch (failure) {
      setActionError(describeDeliveryError(failure));
    } finally {
      setRetryingId(null);
    }
  };

  const openReplace = async (delivery: ApiOrderDelivery) => {
    setReplaceDelivery(delivery);
    setReplaceItem(null);
    setReplaceSelection("");
    setReplaceReason("");
    setReplaceComplaint(false);
    setReplaceError(null);
    setReplaceLoading(true);
    setActionError("");
    setActionNotice("");
    try {
      const response = await adminApi.getOrderDeliveryOptions(order.id);
      const item = response.items.find((row) => row.order_item_id === delivery.order_item_id) ?? null;
      setReplaceItem(item);
    } catch (failure) {
      setReplaceError(describeDeliveryError(failure));
    } finally {
      setReplaceLoading(false);
    }
  };

  const confirmReplace = async () => {
    if (!replaceDelivery || !replaceSelection) return;
    setReplaceSubmitting(true);
    setReplaceError(null);
    setActionError("");
    setActionNotice("");
    try {
      const result = await adminApi.replaceOrderDeliveryAccount(
        order.id,
        replaceDelivery.id,
        replaceSelection,
        replaceReason.trim(),
        replaceComplaint,
      );
      const replacement = result.delivery.replacements?.[result.delivery.replacements.length - 1];
      setOrder(await adminApi.getOrder(order.id));
      setReplaceDelivery(null);
      setActionNotice(`Penggantian akun diproses. ${replacementStatusLabel(replacement?.status)}.`);
    } catch (failure) {
      setReplaceError(describeDeliveryError(failure));
    } finally {
      setReplaceSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title={`Pesanan ${order.number}`}
        description={`Status ${orderStatusLabel(order.status)} · dibuat ${order.created_at ? formatDateTimeWIB(order.created_at) : "—"} WIB`}
        actions={
          <>
            {canSend && (
              <button
                className="button button-primary button-sm"
                type="button"
                onClick={() => void openSendPicker()}
                disabled={pickerLoading || pickerSubmitting}
              >
                <MailCheck size={13} /> {sendLabel}
              </button>
            )}
            <Link className="button button-secondary button-sm" href="/dashboard/orders">
              <ArrowLeft size={13} /> Kembali
            </Link>
          </>
        }
      />

      {DEMO_MODE && (
        <div className="demo-banner"><PackageCheck size={15} /><span>Pesanan sandbox. Tidak ada layanan yang dibeli dan tidak ada pembayaran nyata.</span></div>
      )}

      {actionNotice && <div className="notice success" role="status">{actionNotice}</div>}
      {actionError && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{actionError}</div>}

      <section className="status-pair" aria-label="Status pembayaran dan pengiriman">
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Status pembayaran</h2>
            <CreditCard size={14} className="muted" aria-hidden="true" />
          </div>
          <span className={`badge ${paymentSummary.paid ? "status-success" : "status-warning"}`}>
            {paymentSummary.label}
          </span>
          <div className="summary-lines" style={{ marginBottom: 0 }}>
            <div className="summary-line"><span>Metode</span><strong>{paymentSummary.method ?? "—"}</strong></div>
            <div className="summary-line">
              <span>Waktu pembayaran</span>
              <strong>{paymentSummary.paidAt ? `${formatDateTimeWIB(paymentSummary.paidAt)} WIB` : "—"}</strong>
            </div>
            <div className="summary-line">
              <span>Status API</span>
              <strong className="tabular">{paymentSummary.status || "—"}</strong>
            </div>
          </div>
        </article>
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Status pengiriman</h2>
            <ShieldCheck size={14} className="muted" aria-hidden="true" />
          </div>
          <span className={`badge ${deliverySummary.tone}`}>{deliverySummary.label}</span>
          <div className="summary-lines" style={{ marginBottom: 0 }}>
            <div className="summary-line">
              <span>Item terkirim</span>
              <strong className="tabular">{deliverySummary.sent} / {deliverySummary.total}</strong>
            </div>
            <div className="summary-line">
              <span>Pengiriman gagal</span>
              <strong className="tabular" style={{ color: deliverySummary.failed > 0 ? "var(--danger)" : undefined }}>
                {deliverySummary.failed}
              </strong>
            </div>
            <div className="summary-line">
              <span>Riwayat penggantian</span>
              <strong className="tabular">{replacementHistory.length}</strong>
            </div>
          </div>
        </article>
      </section>

      {pickerOpen && (
        <DeliveryAccountPicker
          items={pickerItems}
          deliveries={deliveries}
          selection={pickerSelection}
          onSelect={(itemId, accountId) => setPickerSelection((current) => ({ ...current, [itemId]: accountId }))}
          onCancel={() => setPickerOpen(false)}
          onConfirm={() => void confirmSend()}
          onRetry={() => void openSendPicker()}
          loading={pickerLoading}
          error={pickerError}
          submitting={pickerSubmitting}
          approvable={approvable}
        />
      )}

      {replaceDelivery && (
        <ReplaceAccountPanel
          delivery={replaceDelivery}
          item={replaceItem}
          itemName={itemNameById.get(replaceDelivery.order_item_id) ?? "item pesanan"}
          selectedId={replaceSelection}
          reason={replaceReason}
          complaintApproved={replaceComplaint}
          onSelect={setReplaceSelection}
          onReason={setReplaceReason}
          onComplaint={setReplaceComplaint}
          onCancel={() => setReplaceDelivery(null)}
          onConfirm={() => void confirmReplace()}
          onRetry={() => void openReplace(replaceDelivery)}
          loading={replaceLoading}
          error={replaceError}
          submitting={replaceSubmitting}
        />
      )}

      <section className="metric-grid" aria-label="Ringkasan pesanan">
        <article className="card metric-card">
          <div className="metric-label"><span>Status pesanan</span></div>
          <div style={{ marginTop: 8 }}><StatusBadge status={order.status} /></div>
        </article>
        <article className="card metric-card">
          <div className="metric-label"><span>Total</span></div>
          <strong className="metric-value tabular">{formatIDR(order.total)}</strong>
          <span className="metric-change">{order.currency}</span>
        </article>
        <article className="card metric-card">
          <div className="metric-label"><span>Subtotal</span></div>
          <strong className="metric-value tabular">{formatIDR(order.subtotal)}</strong>
        </article>
        <article className="card metric-card">
          <div className="metric-label"><span>Diskon</span></div>
          <strong className="metric-value tabular">{formatIDR(order.discount)}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Item pesanan</h2>
            <span className="muted" style={{ fontSize: 9 }}>{items.length} item</span>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Durasi</th>
                  <th>Jumlah</th>
                  <th>Perangkat</th>
                  <th>Harga satuan</th>
                  <th>Total baris</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada item pesanan.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id}>
                    <td className="table-primary">{item.product_name}</td>
                    <td>{item.duration_name}</td>
                    <td className="tabular">{item.quantity}</td>
                    <td className="tabular">{item.device_count ?? "—"}</td>
                    <td className="tabular">{formatIDR(item.unit_price)}</td>
                    <td className="tabular">{formatIDR(item.line_total ?? item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">Pembayaran</h2>
            <CreditCard size={14} className="muted" />
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Jumlah</th>
                  <th>Referensi</th>
                  <th>Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>Belum ada pembayaran tercatat.</td></tr>
                ) : payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="table-primary">{payment.provider}</td>
                    <td><StatusBadge status={payment.status} /></td>
                    <td className="tabular">{formatIDR(payment.amount)}</td>
                    <td className="tabular">{payment.provider_payment_id ?? "—"}</td>
                    <td>{payment.paid_at ? `${formatDateTimeWIB(payment.paid_at)} WIB` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ margin: "12px 0 0" }}>
            Status pembayaran ditampilkan apa adanya dari API. Tidak ada metode atau nominal yang ditambahkan di UI.
          </p>
        </article>
      </section>

      <section className="card" style={{ padding: 22 }} aria-label="Status pengiriman akun">
        <div className="panel-header" style={{ padding: 0 }}>
          <div>
            <h2 className="panel-title">Pengiriman akun</h2>
            <span className="muted" style={{ fontSize: 9 }}>
              Kredensial hanya dikirim ke email pembeli terverifikasi setelah persetujuan admin.
            </span>
          </div>
        </div>
        {deliveries.length === 0 ? (
          <p className="muted small" style={{ margin: "12px 0 0" }} role="status">
            Belum ada baris pengiriman. Baris dibuat saat pesanan disetujui untuk dikirim.
          </p>
        ) : (
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Akun & masa akses</th>
                  <th>Percobaan</th>
                  <th>Dikirim</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => {
                  const errorGuidance = deliveryErrorGuidanceFor(delivery.error_code);
                  const canReplace = deliveryNeedsReplacement(delivery);
                  const itemName = itemNameById.get(delivery.order_item_id) ?? "item pesanan";
                  return (
                    <tr key={delivery.id}>
                      <td className="table-primary">{itemNameById.get(delivery.order_item_id) ?? "Item pesanan"}</td>
                      <td style={{ whiteSpace: "normal", minWidth: 160 }}>
                        <span className={`badge ${deliveryStatusTone[delivery.status] ?? "status-info"}`}>
                          {deliveryStatusLabels[delivery.status] ?? delivery.status}
                        </span>
                        {delivery.error_code && (
                          <div style={{ fontSize: 9, marginTop: 4, color: "var(--danger)" }}>
                            {errorGuidance?.label ?? delivery.error_code} <span className="tabular">({delivery.error_code})</span>
                            {errorGuidance && <div className="table-secondary">{errorGuidance.action}</div>}
                          </div>
                        )}
                        {delivery.last_attempt_at && (
                          <div className="table-secondary">Terakhir dicoba {formatDateTimeWIB(delivery.last_attempt_at)} WIB</div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "normal", minWidth: 230 }}>
                        {(delivery.assigned_accounts ?? []).length === 0 ? (
                          <span className="muted small">Belum ada akun terpasang.</span>
                        ) : (
                          <div className="delivery-account-list">
                            {(delivery.assigned_accounts ?? []).map((account) => (
                              <div className="delivery-account-line" key={account.inventory_account_id}>
                                <strong>{account.label}</strong>
                                <span className="badge status-info">{remainingAccessLabel(account)}</span>
                                <span className="table-secondary">
                                  {account.activated_at
                                    ? `Aktif sejak ${formatDateTimeWIB(account.activated_at)} WIB · `
                                    : ""}
                                  {account.access_expires_at
                                    ? `akses sampai ${formatDateTimeWIB(account.access_expires_at)} WIB`
                                    : "masa akses belum dihitung"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="tabular">{delivery.attempts}</td>
                      <td>{delivery.sent_at ? `${formatDateTimeWIB(delivery.sent_at)} WIB` : "—"}</td>
                      <td>
                        <div className="table-actions">
                          {delivery.status === "failed" && (
                            <button
                              className="table-action"
                              type="button"
                              aria-label={`Ulangi pengiriman ${itemName}`}
                              onClick={() => void retryDelivery(delivery)}
                              disabled={retryingId === delivery.id}
                            >
                              <RotateCw size={13} />
                            </button>
                          )}
                          {canReplace && (
                            <button
                              className="button button-secondary button-sm"
                              type="button"
                              aria-label={`Ganti akun ${itemName}`}
                              onClick={() => void openReplace(delivery)}
                            >
                              <RefreshCw size={13} /> Ganti akun
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {deliveries.some((delivery) => delivery.status === "failed") && (
          <p className="muted small" style={{ margin: "12px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} /> Kegagalan tidak mengubah status pesanan; perbaiki penyebab lalu ulangi pengiriman.
          </p>
        )}
      </section>

      <section className="card" style={{ padding: 22 }} aria-label="Riwayat penggantian akun">
        <div className="panel-header" style={{ padding: 0 }}>
          <div>
            <h2 className="panel-title">Riwayat penggantian akun</h2>
            <span className="muted" style={{ fontSize: 9 }}>
              Audit penggantian dan status email pengganti. Tidak memuat kredensial.
            </span>
          </div>
          <span className="muted" style={{ fontSize: 9 }}>{replacementHistory.length} penggantian</span>
        </div>
        {replacementHistory.length === 0 ? (
          <p className="muted small" style={{ margin: "12px 0 0" }} role="status">
            Belum ada penggantian akun untuk pesanan ini.
          </p>
        ) : (
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Akun lama</th>
                  <th>Akun baru</th>
                  <th>Alasan</th>
                  <th>Status email</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {replacementHistory.map((replacement) => (
                  <tr key={replacement.id}>
                    <td className="table-primary">{itemNameById.get(replacement.order_item_id) ?? "Item pesanan"}</td>
                    <td>{accountReference(replacement.old_inventory_account_id, accountLabels)}</td>
                    <td>{accountReference(replacement.inventory_account_id, accountLabels)}</td>
                    <td style={{ whiteSpace: "normal", minWidth: 220 }}>
                      {replacement.reason}
                      {replacement.complaint_approved && <span className="badge status-warning" style={{ marginLeft: 6 }}>Komplain disetujui</span>}
                    </td>
                    <td>
                      <span className={`badge ${replacementStatusTone(replacement.status)}`}>
                        {replacementStatusLabel(replacement.status)}
                      </span>
                      {replacement.error_code && (
                        <div className="table-secondary tabular">{replacement.error_code}</div>
                      )}
                    </td>
                    <td>{replacement.email_sent_at ? `${formatDateTimeWIB(replacement.email_sent_at)} WIB` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 22 }}>
        <h2 className="panel-title">Pelanggan dan jadwal</h2>
        <div className="summary-lines" style={{ marginTop: 12 }}>
          <div className="summary-line"><span>Nama</span><strong>{order.customer?.name ?? "—"}</strong></div>
          <div className="summary-line"><span>Email</span><strong>{order.customer?.email ?? "—"}</strong></div>
          <div className="summary-line"><span>User ID</span><strong className="tabular">{order.user_id ?? "—"}</strong></div>
          <div className="summary-line"><span>Batas pembayaran</span><strong>{order.payment_due_at ? `${formatDateTimeWIB(order.payment_due_at)} WIB` : "—"}</strong></div>
          <div className="summary-line"><span>Terakhir diperbarui</span><strong>{order.updated_at ? `${formatDateTimeWIB(order.updated_at)} WIB` : "—"}</strong></div>
          {order.shipping_address && <div className="summary-line"><span>Alamat</span><strong>{order.shipping_address}</strong></div>}
          {order.notes && <div className="summary-line"><span>Catatan</span><strong>{order.notes}</strong></div>}
        </div>
      </section>
    </div>
  );
}
