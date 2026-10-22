"use client";

import { AlertTriangle, CheckCircle2, Loader2, RotateCw, ShieldCheck } from "lucide-react";
import type { ApiDeliveryAccountOption, ApiDeliveryItemOptions, ApiOrderDelivery } from "@/lib/api";
import { accountDisabledReason, accountUsageLabel } from "@/lib/order-delivery";

function AccountChoices({
  legend,
  accounts,
  quantity,
  selectedId,
  onSelect,
  excludeIds = [],
}: {
  legend: string;
  accounts: ApiDeliveryAccountOption[];
  quantity: number;
  selectedId: string;
  onSelect: (accountId: string) => void;
  excludeIds?: string[];
}) {
  const candidates = accounts.filter((account) => !excludeIds.includes(account.inventory_account_id));
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="muted" style={{ marginBottom: 8, fontSize: 10, fontWeight: 650 }}>
        {legend}
      </legend>
      {candidates.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }} role="status">
          Tidak ada akun yang dapat dipilih untuk item ini.
        </p>
      ) : (
        <div className="account-choice-list">
          {candidates.map((account) => {
            const disabledReason = accountDisabledReason(account, quantity);
            const disabled = disabledReason !== null;
            const checked = selectedId === account.inventory_account_id;
            return (
              <label
                key={account.inventory_account_id}
                className={`account-choice${disabled ? " disabled" : ""}${checked ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name={`account-${legend}`}
                  value={account.inventory_account_id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onSelect(account.inventory_account_id)}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 650 }}>
                    {account.label}
                    {account.assigned_to_item && (
                      <span className="badge status-info" style={{ marginLeft: 6 }}>Akun saat ini</span>
                    )}
                  </span>
                  <span className="account-meta" style={{ display: "flex" }}>
                    <span>Pemakaian {accountUsageLabel(account)}</span>
                    <span>Slot tersisa {account.remaining_slots}</span>
                    <span>
                      {account.days_remaining === null || account.days_remaining === undefined
                        ? "Tanpa batas waktu"
                        : account.days_remaining > 0
                          ? `Aktif ${account.days_remaining} hari lagi`
                          : "Akun kedaluwarsa"}
                    </span>
                  </span>
                  {disabledReason && (
                    <span className="muted" style={{ display: "block", marginTop: 3, fontSize: 9, color: "var(--danger)" }}>
                      {disabledReason}
                    </span>
                  )}
                </span>
                {account.used_by_customer && <span className="badge status-warning">Sudah dipakai user ini</span>}
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

export function DeliveryAccountPicker({
  items,
  deliveries,
  selection,
  onSelect,
  onCancel,
  onConfirm,
  onRetry,
  loading,
  error,
  submitting,
  approvable,
}: {
  items: ApiDeliveryItemOptions[];
  deliveries: ApiOrderDelivery[];
  selection: Record<string, string>;
  onSelect: (itemId: string, accountId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  approvable: boolean;
}) {
  const unsent = items.filter(
    (item) => deliveries.find((delivery) => delivery.id === item.delivery_id)?.status !== "sent",
  );
  const canConfirm =
    !submitting &&
    unsent.length > 0 &&
    unsent.every((item) => Boolean(selection[item.order_item_id]));

  return (
    <section className="card panel" aria-labelledby="delivery-picker-title" style={{ borderColor: "var(--line-strong)" }}>
      <div className="panel-header" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="panel-title" id="delivery-picker-title">Pilih akun untuk dikirim</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Pilih satu akun per item. Akun yang sudah dipakai pembeli ini dinonaktifkan agar pembelian berulang mendapat akun berbeda.
            Kredensial tetap hanya dikirim ke email pembeli.
          </p>
        </div>
        <ShieldCheck size={18} className="muted" aria-hidden="true" />
      </div>

      {loading ? (
        <p className="muted small" role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={14} className="commerce-spin" aria-hidden="true" /> Memuat pilihan akun…
        </p>
      ) : error ? (
        <div className="notice" role="alert" style={{ color: "var(--danger)" }}>
          <p style={{ margin: "0 0 8px" }}>{error}</p>
          <button className="button button-secondary button-sm" type="button" onClick={onRetry}>
            <RotateCw size={13} /> Coba lagi
          </button>
        </div>
      ) : unsent.length === 0 ? (
        <p className="muted small" role="status" style={{ margin: 0 }}>
          Semua item pesanan ini sudah terkirim. Gunakan Ganti akun bila pembeli membutuhkan akun pengganti.
        </p>
      ) : (
        <div className="delivery-picker-list">
          {unsent.map((item) => {
            const currentAccounts = item.accounts.filter((account) => account.assigned_to_item);
            const selectable = item.accounts.filter((account) => account.can_assign && !account.used_by_customer);
            return (
              <article className="delivery-item" key={item.delivery_id}>
                <div className="delivery-item-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: 11 }}>{item.product_name}</h3>
                    <span className="muted small">
                      {item.duration_name} · jumlah {item.quantity}
                      {currentAccounts.length > 0 ? ` · akun saat ini ${currentAccounts.map((account) => account.label).join(", ")}` : ""}
                    </span>
                  </div>
                  <span className="badge status-info">Kapasitas maks. 5 user/akun</span>
                </div>
                <AccountChoices
                  legend={`Akun untuk ${item.product_name}`}
                  accounts={item.accounts}
                  quantity={item.quantity}
                  selectedId={selection[item.order_item_id] ?? ""}
                  onSelect={(accountId) => onSelect(item.order_item_id, accountId)}
                />
                {selectable.length === 0 && (
                  <p className="small" style={{ margin: "8px 0 0", color: "var(--danger)", display: "flex", gap: 6 }}>
                    <AlertTriangle size={13} aria-hidden="true" />
                    Tidak ada akun eligible. Tambah akun aktif atau kurangi jumlah item sebelum mengirim.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="delivery-picker-footer">
        <button className="button button-secondary button-sm" type="button" onClick={onCancel} disabled={submitting}>
          Batal
        </button>
        <button className="button button-primary button-sm" type="button" onClick={onConfirm} disabled={!canConfirm || loading || Boolean(error)}>
          {submitting ? (
            <><Loader2 size={13} className="commerce-spin" aria-hidden="true" /> Memproses…</>
          ) : (
            <><CheckCircle2 size={13} aria-hidden="true" /> {approvable ? "Simpan akun & kirim" : "Simpan akun & ulangi pengiriman"}</>
          )}
        </button>
      </div>
    </section>
  );
}

export function ReplaceAccountPanel({
  delivery,
  item,
  itemName,
  selectedId,
  reason,
  complaintApproved,
  onSelect,
  onReason,
  onComplaint,
  onCancel,
  onConfirm,
  onRetry,
  loading,
  error,
  submitting,
}: {
  delivery: ApiOrderDelivery;
  item: ApiDeliveryItemOptions | null;
  itemName: string;
  selectedId: string;
  reason: string;
  complaintApproved: boolean;
  onSelect: (accountId: string) => void;
  onReason: (value: string) => void;
  onComplaint: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  loading: boolean;
  error: string | null;
  submitting: boolean;
}) {
  const currentIds = (delivery.assigned_accounts ?? []).map((account) => account.inventory_account_id);
  const canConfirm = !submitting && Boolean(selectedId) && reason.trim().length > 0 && reason.trim().length <= 500;

  return (
    <section
      className="card panel"
      role="dialog"
      aria-labelledby="replace-account-title"
      aria-describedby="replace-account-description"
      style={{ borderColor: "var(--line-strong)" }}
    >
      <div className="panel-header" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="panel-title" id="replace-account-title">Ganti akun {itemName}</h2>
          <p className="muted small" id="replace-account-description" style={{ margin: "4px 0 0" }}>
            Pilih akun aktif lain untuk pembeli. Sistem menandai slot lama released dan mengirim email pengganti.
            Tidak ada order atau pembayaran baru yang dibuat.
          </p>
        </div>
        <AlertTriangle size={18} style={{ color: "var(--warning)" }} aria-hidden="true" />
      </div>

      {loading ? (
        <p className="muted small" role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={14} className="commerce-spin" aria-hidden="true" /> Memuat akun pengganti…
        </p>
      ) : error ? (
        <div className="notice" role="alert" style={{ color: "var(--danger)" }}>
          <p style={{ margin: "0 0 8px" }}>{error}</p>
          <button className="button button-secondary button-sm" type="button" onClick={onRetry}>
            <RotateCw size={13} /> Coba lagi
          </button>
        </div>
      ) : !item ? (
        <p className="muted small" role="status" style={{ margin: 0 }}>
          Opsi akun untuk item ini tidak tersedia. Muat ulang pesanan lalu coba lagi.
        </p>
      ) : (
        <>
          <AccountChoices
            legend={`Akun pengganti untuk ${item.product_name}`}
            accounts={item.accounts}
            quantity={item.quantity}
            selectedId={selectedId}
            onSelect={onSelect}
            excludeIds={currentIds}
          />

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="replacement-reason">Alasan penggantian <span className="field-required">*</span></label>
            <textarea
              id="replacement-reason"
              className="textarea"
              value={reason}
              maxLength={500}
              onChange={(event) => onReason(event.target.value)}
              placeholder="Contoh: akun lama expired, pembeli komplain tidak bisa masuk."
              aria-describedby="replacement-reason-help"
            />
            <span className="muted small" id="replacement-reason-help">{reason.trim().length}/500 karakter</span>
          </div>

          <label className="check-row" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={complaintApproved}
              onChange={(event) => onComplaint(event.target.checked)}
            />
            <span>
              Komplain pelanggan sudah disetujui
              <span className="muted small" style={{ display: "block" }}>
                Centang hanya bila komplain sudah diverifikasi admin. Diperlukan saat masa akses lama masih aktif.
              </span>
            </span>
          </label>
        </>
      )}

      <div className="delivery-picker-footer">
        <button className="button button-secondary button-sm" type="button" onClick={onCancel} disabled={submitting}>
          Batal
        </button>
        <button className="button button-primary button-sm" type="button" onClick={onConfirm} disabled={!canConfirm || loading || Boolean(error)}>
          {submitting ? (
            <><Loader2 size={13} className="commerce-spin" aria-hidden="true" /> Mengganti…</>
          ) : (
            <><CheckCircle2 size={13} aria-hidden="true" /> Konfirmasi ganti akun</>
          )}
        </button>
      </div>
    </section>
  );
}
