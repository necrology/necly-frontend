"use client";

import { Plus, Search, TicketCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";
import { formatIDR } from "@/lib/money";
import { vouchers as seedVouchers, type Voucher } from "@/data/seed";
import { ApiError, adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiVoucher } from "@/lib/admin-mappers";
import { formatDateID } from "@/lib/money";

function defaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export default function VouchersPage() {
  const [items, setItems] = useState<Voucher[]>(seedVouchers);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [voucherType, setVoucherType] = useState<"Persen" | "Nominal">("Persen");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiVouchers, setApiVouchers] = useState<Voucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi tidak valid. Silakan masuk kembali.");
        return;
      }
      if (user.role !== "admin") {
        setError("Akses ditolak: hanya admin yang dapat mengelola voucher");
        return;
      }
      const response = await adminApi.listVouchers({ page: 1, per_page: 50 });
      if (!Array.isArray(response.vouchers)) {
        setError("Respons voucher dari server tidak sesuai kontrak");
        return;
      }
      setApiVouchers((response.vouchers as Record<string, unknown>[]).map(mapApiVoucher));
    } catch {
      setError("Gagal memuat voucher dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(() => loadVouchers());
  }, [loadVouchers]);

  const sourceVouchers = useMemo(() => (DEMO_MODE ? items : apiVouchers ?? []), [items, apiVouchers]);
  const rows = useMemo(
    () => sourceVouchers.filter((voucher) => voucher.code.toUpperCase().includes(query.toUpperCase())),
    [sourceVouchers, query],
  );

  const metrics = useMemo(() => {
    const usesKnown = sourceVouchers.every((voucher) => voucher.uses !== null);
    return {
      active: sourceVouchers.filter((voucher) => voucher.active).length,
      uses: usesKnown ? sourceVouchers.reduce((sum, voucher) => sum + (voucher.uses ?? 0), 0) : null,
      remaining: usesKnown
        ? sourceVouchers.reduce((sum, voucher) => sum + Math.max(0, voucher.limit - (voucher.uses ?? 0)), 0)
        : null,
    };
  }, [sourceVouchers]);

  const toggle = async (voucher: Voucher) => {
    setActionError("");
    if (DEMO_MODE) {
      setItems((current) =>
        current.map((item) => (item.code === voucher.code ? { ...item, active: !item.active } : item)),
      );
      return;
    }
    if (!voucher.id) {
      setActionError(`Voucher ${voucher.code} tidak memiliki ID server; muat ulang daftar.`);
      return;
    }
    try {
      await adminApi.updateVoucher(voucher.id, { active: !voucher.active });
      setNotice(`Voucher ${voucher.code} ${voucher.active ? "dinonaktifkan" : "diaktifkan"}.`);
      await loadVouchers();
    } catch (failure) {
      setActionError(
        failure instanceof ApiError
          ? `Gagal mengubah status voucher: ${failure.message}`
          : "Gagal mengubah status voucher.",
      );
    }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code") ?? "").trim().toUpperCase();
    const type = String(data.get("type") ?? "Persen");
    const value = Number(data.get("value") ?? 0);
    const limit = Number(data.get("limit") ?? 0);
    const expires = String(data.get("expires") ?? "");

    if (!code || value <= 0) {
      setActionError("Kode dan nilai voucher wajib diisi dengan benar.");
      setSubmitting(false);
      return;
    }
    if (!Number.isInteger(limit) || limit < 1) {
      setActionError("Batas penggunaan wajib diisi minimal 1; nilai 0 berarti tanpa batas di backend.");
      setSubmitting(false);
      return;
    }
    if (type === "Persen" && (value < 1 || value > 100)) {
      setActionError("Nilai voucher persen harus antara 1 dan 100.");
      setSubmitting(false);
      return;
    }

    if (DEMO_MODE) {
      const next: Voucher = {
        code,
        type: type === "Nominal" ? "Nominal" : "Persen",
        value,
        uses: 0,
        limit,
        expires: expires ? formatDateID(expires) : "31 Des 2026",
        active: true,
      };
      setItems((current) => [next, ...current]);
      setCreating(false);
      setNotice(`${code} dibuat di status demo lokal.`);
      setSubmitting(false);
      return;
    }

    try {
      const startsAt = new Date();
      const endsAt = expires ? new Date(`${expires}T23:59:59Z`) : new Date(startsAt.getTime() + 30 * 86_400_000);
      if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
        setActionError("Tanggal berakhir harus setelah waktu sekarang.");
        return;
      }
      await adminApi.createVoucher({
        code,
        type: type === "Nominal" ? "fixed" : "percentage",
        value,
        usage_limit: limit,
        min_order: 0,
        max_discount: 0,
        per_user_limit: 0,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        active: true,
      });
      setCreating(false);
      setNotice(`Voucher ${code} dibuat.`);
      await loadVouchers();
    } catch (failure) {
      setActionError(
        failure instanceof ApiError
          ? `Gagal membuat voucher: ${failure.message}`
          : "Gagal membuat voucher.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }} role="alert">
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat voucher</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{error}</p>
          <button className="button button-primary button-sm" onClick={() => void loadVouchers()} style={{ minWidth: 160 }}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Voucher"
        description="Buat insentif terarah tanpa kehilangan jejak eksposur."
        actions={
          <button className="button button-primary button-sm" onClick={() => setCreating(true)}>
            <Plus size={13} /> Buat voucher
          </button>
        }
      />
      <section className="metric-grid">
        <MetricCard label="Kode aktif" value={String(metrics.active)} change="Dari voucher yang dimuat" />
        <MetricCard
          label="Penukaran"
          value={metrics.uses === null ? "—" : String(metrics.uses)}
          change={metrics.uses === null ? "Jumlah penukaran tidak dikirim API" : "Semua penggunaan voucher"}
        />
        <MetricCard
          label="Sisa penggunaan"
          value={metrics.remaining === null ? "—" : String(metrics.remaining)}
          change={metrics.remaining === null ? "Bergantung pada data penukaran" : "Sebelum batas kampanye"}
        />
        <MetricCard
          label="Pesanan teratribusi"
          value={DEMO_MODE ? "12%" : "—"}
          change={DEMO_MODE ? "Periode pelaporan demo" : "Belum tersedia dari API"}
          icon={<TicketCheck size={14} />}
        />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}
      {actionError && !creating && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{actionError}</div>}
      {creating && (
        <Modal
          title="Voucher baru"
          description="Voucher aktif langsung dapat dipakai pelanggan setelah disimpan."
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={() => setCreating(false)} disabled={submitting}>
                Batal
              </button>
              <button className="button button-primary" type="submit" form="voucher-form" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Simpan voucher"}
              </button>
            </>
          }
        >
          <form id="voucher-form" onSubmit={create} aria-label="Form voucher baru">
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="v-code">Kode</label>
                <input className="input" id="v-code" name="code" placeholder="HEMAT20K" required />
              </div>
              <div className="field">
                <label className="label" htmlFor="v-type">Tipe</label>
                <SearchableSelect
                  inputId="v-type"
                  name="type"
                  ariaLabel="Tipe"
                  value={voucherType}
                  onChange={(value) => setVoucherType(value as "Persen" | "Nominal")}
                  options={[{ value: "Persen", label: "Persen" }, { value: "Nominal", label: "Nominal" }]}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="v-value">Nilai</label>
                <input className="input" id="v-value" name="value" type="number" min="1" placeholder="10" required />
              </div>
              <div className="field">
                <label className="label" htmlFor="v-limit">Batas penggunaan</label>
                <input className="input" id="v-limit" name="limit" type="number" min="1" placeholder="50" />
              </div>
              <div className="field">
                <label className="label" htmlFor="v-expires">Berakhir</label>
                <input className="input" id="v-expires" name="expires" type="date" defaultValue={defaultExpiry()} />
              </div>
              {actionError && (
                <div className="notice field-full" role="alert" style={{ color: "var(--danger)" }}>{actionError}</div>
              )}
            </div>
          </form>
        </Modal>
      )}
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode voucher…" />
        </div>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Tipe</th>
                <th>Nilai</th>
                <th>Terpakai</th>
                <th>Batas</th>
                <th>Kedaluwarsa</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={7} className="muted" style={{ textAlign: "center" }}>Belum ada voucher.</td></tr>
              ) : rows.map((voucher) => (
                <tr key={voucher.id ?? voucher.code}>
                  <td className="table-primary">{voucher.code}</td>
                  <td>{voucher.type}</td>
                  <td>{voucher.type === "Persen" ? `${voucher.value}%` : formatIDR(voucher.value)}</td>
                  <td className="tabular">{voucher.uses === null ? "—" : voucher.uses}</td>
                  <td className="tabular">{voucher.limit}</td>
                  <td>{voucher.expires}</td>
                  <td>
                    <button
                      className={`toggle ${voucher.active ? "on" : ""}`}
                      type="button"
                      aria-label={`${voucher.active ? "Nonaktifkan" : "Aktifkan"} ${voucher.code}`}
                      onClick={() => void toggle(voucher)}
                      disabled={!DEMO_MODE && !voucher.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
