"use client";

import { AlertTriangle, CheckCircle2, Loader2, RotateCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import {
  ApiError,
  adminApi,
  apiErrorCode,
  type ApiRevocationAccountImpact,
  type ApiRevokeAccessResponse,
} from "@/lib/api";

type RevokeAccessPanelProps = {
  orderId: string;
  orderStatus: string;
  onClose: () => void;
  onSuccess: (result: ApiRevokeAccessResponse) => void;
};

export function RevokeAccessPanel({ orderId, orderStatus, onClose, onSuccess }: RevokeAccessPanelProps) {
  const [impact, setImpact] = useState<ApiRevocationAccountImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<"cancelled" | "refunded">(
    orderStatus === "delivered" || orderStatus === "completed" ? "refunded" : "cancelled",
  );
  const [reason, setReason] = useState("");
  const [providerConfirmed, setProviderConfirmed] = useState(false);
  const [sharedAcknowledged, setSharedAcknowledged] = useState(false);
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadImpact = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await adminApi.getOrderRevocationImpact(orderId);
      setImpact(response.accounts ?? []);
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Gagal memuat dampak pencabutan akses. Coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadImpact();
    });
    return () => { cancelled = true; };
  }, [loadImpact]);

  const delivered = impact.length > 0;
  const shared = impact.some((account) => account.other_active_users > 0);
  const allPasswordsFilled = impact.every((account) => (newPasswords[account.inventory_account_id] ?? "").trim().length > 0);
  const canSubmit =
    !submitting &&
    !loading &&
    !loadError &&
    reason.trim().length > 0 &&
    reason.trim().length <= 500 &&
    (!delivered || (providerConfirmed && allPasswordsFilled)) &&
    (!shared || sharedAcknowledged);

  const confirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await adminApi.revokeOrderAccess(orderId, {
        status,
        reason: reason.trim(),
        provider_rotation_confirmed: delivered ? providerConfirmed : false,
        shared_impact_acknowledged: shared ? sharedAcknowledged : false,
        new_passwords: delivered ? newPasswords : {},
      });
      onSuccess(result);
    } catch (error) {
      if (error instanceof ApiError) {
        const payload = error.payload as { accounts?: ApiRevocationAccountImpact[] } | undefined;
        if (Array.isArray(payload?.accounts)) setImpact(payload.accounts);
        const code = apiErrorCode(error);
        if (code === "provider_rotation_required") {
          setSubmitError("Konfirmasi bahwa kata sandi akun sudah diganti di platform sebelum melanjutkan.");
        } else if (code === "shared_access_impact") {
          setSubmitError("Akun ini masih dipakai pelanggan lain. Centang konfirmasi dampak shared account.");
        } else if (code === "new_password_required") {
          setSubmitError("Isi kata sandi baru untuk setiap akun yang sudah dikirim.");
        } else {
          setSubmitError(error.message || "Pencabutan akses gagal. Coba lagi.");
        }
      } else {
        setSubmitError("Pencabutan akses gagal. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="card panel"
      role="dialog"
      aria-labelledby="revoke-access-title"
      aria-describedby="revoke-access-description"
      style={{ borderColor: "var(--danger)" }}
    >
      <div className="panel-header" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="panel-title" id="revoke-access-title">Batalkan langganan &amp; cabut akses</h2>
          <p className="muted small" id="revoke-access-description" style={{ margin: "4px 0 0" }}>
            Pesanan dihentikan, kode OTP lama langsung tidak berlaku, dan slot akun dilepas setelah kata sandi
            platform diganti.
          </p>
        </div>
        <AlertTriangle size={18} style={{ color: "var(--danger)" }} aria-hidden="true" />
      </div>

      {loading ? (
        <p className="muted small" role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={14} className="commerce-spin" aria-hidden="true" /> Memeriksa akun yang sudah dikirim…
        </p>
      ) : loadError ? (
        <div className="notice" role="alert" style={{ color: "var(--danger)" }}>
          <p style={{ margin: "0 0 8px" }}>{loadError}</p>
          <button className="button button-secondary button-sm" type="button" onClick={() => void loadImpact()}>
            <RotateCw size={13} /> Coba lagi
          </button>
        </div>
      ) : (
        <>
          {delivered ? (
            <div className="notice" role="note" style={{ marginBottom: 14 }}>
              <ShieldCheck size={16} aria-hidden="true" />
              <div>
                <strong>Akun sudah pernah dikirim. Hentikan akses lewat langkah berikut:</strong>
                <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  <li>Buka akun di platform (misalnya ChatGPT) dan ganti kata sandi.</li>
                  <li>Pilih keluar dari semua perangkat / revoke semua sesi.</li>
                  <li>Masukkan kata sandi baru di bawah agar data akun Necly ikut diperbarui.</li>
                </ol>
                <p className="muted small" style={{ margin: "6px 0 0" }}>
                  Tanpa langkah ini, pembeli masih bisa masuk memakai kata sandi lama walau pesanan sudah dibatalkan.
                </p>
              </div>
            </div>
          ) : (
            <p className="muted small" role="status" style={{ margin: "0 0 14px" }}>
              Akun belum pernah dikirim ke pembeli. Pembatalan cukup melepas slot reservasi.
            </p>
          )}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="revoke-status">Status akhir</label>
              <SearchableSelect
                inputId="revoke-status"
                ariaLabel="Status akhir"
                value={status}
                onChange={(value) => setStatus(value as "cancelled" | "refunded")}
                options={[
                  { value: "cancelled", label: "Dibatalkan (tanpa refund otomatis)" },
                  { value: "refunded", label: "Dikembalikan (refund)" },
                ]}
              />
            </div>
            <div className="field">
              <label htmlFor="revoke-reason">Alasan <span className="field-required">*</span></label>
              <textarea
                id="revoke-reason"
                className="textarea"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Contoh: pelanggan berhenti berlangganan."
              />
              <span className="muted small">{reason.trim().length}/500 karakter</span>
            </div>
          </div>

          {delivered && (
            <div style={{ marginTop: 8 }}>
              <h3 className="panel-title" style={{ fontSize: 11, marginBottom: 8 }}>Akun yang wajib diganti kata sandinya</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {impact.map((account) => (
                  <div key={account.inventory_account_id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong>{account.label || "Akun langganan"}</strong>
                        <p className="muted small" style={{ margin: "2px 0 0" }}>
                          {account.account_email || "Email akun tidak tercatat"}
                        </p>
                      </div>
                      <span className={`badge ${account.other_active_users > 0 ? "status-warning" : "status-success"}`}>
                        {account.other_active_users > 0
                          ? `${account.other_active_users} pelanggan lain masih aktif`
                          : "Tidak ada pelanggan lain"}
                      </span>
                    </div>
                    <div className="field" style={{ marginTop: 10 }}>
                      <label htmlFor={`new-password-${account.inventory_account_id}`}>
                        Kata sandi baru di platform <span className="field-required">*</span>
                      </label>
                      <input
                        id={`new-password-${account.inventory_account_id}`}
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        value={newPasswords[account.inventory_account_id] ?? ""}
                        onChange={(event) =>
                          setNewPasswords((current) => ({
                            ...current,
                            [account.inventory_account_id]: event.target.value,
                          }))
                        }
                        placeholder="Masukkan kata sandi yang baru diatur di platform"
                      />
                      <span className="muted small">
                        Nilai ini disimpan terenkripsi dan tidak ditampilkan lagi setelah disimpan.
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <label className="check-row" style={{ marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={providerConfirmed}
                  onChange={(event) => setProviderConfirmed(event.target.checked)}
                />
                <span>
                  Saya sudah mengganti kata sandi akun di platform dan logout semua perangkat
                  <span className="muted small" style={{ display: "block" }}>
                    Wajib. Tanpa rotasi, pembeli tetap bisa login memakai kredensial lama.
                  </span>
                </span>
              </label>

              {shared && (
                <label className="check-row" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={sharedAcknowledged}
                    onChange={(event) => setSharedAcknowledged(event.target.checked)}
                  />
                  <span>
                    Saya sudah memberi tahu / akan mengirim kata sandi baru ke pelanggan lain yang masih aktif
                    <span className="muted small" style={{ display: "block" }}>
                      Ganti kata sandi juga mengeluarkan pelanggan lain di akun yang sama.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {submitError && <p className="otp-alert" role="alert" style={{ marginTop: 12 }}>{submitError}</p>}
        </>
      )}

      <div className="delivery-picker-footer">
        <button className="button button-secondary button-sm" type="button" onClick={onClose} disabled={submitting}>
          Batal
        </button>
        <button className="button button-danger button-sm" type="button" onClick={() => void confirm()} disabled={!canSubmit}>
          {submitting ? (
            <><Loader2 size={13} className="commerce-spin" aria-hidden="true" /> Mencabut akses…</>
          ) : (
            <><CheckCircle2 size={13} aria-hidden="true" /> Konfirmasi batalkan &amp; cabut akses</>
          )}
        </button>
      </div>
    </section>
  );
}
