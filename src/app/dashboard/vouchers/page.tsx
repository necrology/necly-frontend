"use client";

import { MoreHorizontal, Plus, Search, TicketCheck, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { formatIDR } from "@/lib/money";
import { vouchers as seedVouchers, type Voucher } from "@/data/seed";
import { adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiVoucher } from "@/lib/admin-mappers";
import { formatDateID } from "@/lib/money";

export default function VouchersPage() {
  const [items, setItems] = useState<Voucher[]>(seedVouchers);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiVouchers, setApiVouchers] = useState<Voucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) {
      bootstrapAuth().then((user) => {
        if (user?.role === "admin") {
          adminApi.listVouchers({ page: 1, per_page: 50 }).then((res) => {
            try {
              const vouchers = (res.vouchers as unknown as Record<string, unknown>[]) ?? [];
              const mappedVouchers = vouchers.map(mapApiVoucher);
              setApiVouchers(mappedVouchers);
              setLoading(false);
            } catch {
              setError("Gagal memproses data voucher dari API");
              setLoading(false);
            }
          }).catch(() => {
            setError("Gagal memuat voucher dari server");
            setLoading(false);
          });
        } else {
          setError("Akses ditolak: hanya admin yang dapat mengelola voucher");
          setLoading(false);
        }
      });
    }
  }, []);

  const sourceVouchers = DEMO_MODE ? items : apiVouchers ?? [];
  const rows = useMemo(() => sourceVouchers.filter((v) => v.code.includes(query.toUpperCase())), [sourceVouchers, query]);

  const toggle = (code: string) => setItems((current) => current.map((item) => (item.code === code ? { ...item, active: !item.active } : item)));

  const create = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = String(data.get("code") ?? "").trim().toUpperCase();
    if (!code) return;
    const next: Voucher = {
      code,
      type: "Persen",
      value: Number(data.get("value") ?? 10),
      uses: 0,
      limit: Number(data.get("limit") ?? 50),
      expires: "31 Des 2026",
      active: true,
    };
    setItems((current) => [next, ...current]);
    setCreating(false);
    setNotice(`${code} dibuat di status demo lokal.`);
  };

  const unavailable = (action: string) => {
    setNotice(`${action} belum tersedia. Hubungkan ke API admin untuk mengaktifkan.`);
    window.setTimeout(() => setNotice(""), 3000);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat voucher</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {error}
          </p>
          <button
            className="button button-primary button-sm"
            onClick={() => window.location.reload()}
            style={{ minWidth: 160 }}
          >
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
        actions={<button className="button button-primary button-sm" onClick={() => unavailable("Buat voucher")}><Plus size={13} /> Buat voucher</button>}
      />
      <section className="metric-grid">
        <MetricCard label="Kode aktif" value={String(sourceVouchers.filter((v) => v.active).length)} change="Lintas kampanye demo saat ini" />
        <MetricCard label="Penukaran" value={String(sourceVouchers.reduce((sum, v) => sum + v.uses, 0))} change="Semua penggunaan voucher bercocok" />
        <MetricCard label="Sisa penggunaan" value={String(sourceVouchers.reduce((sum, v) => sum + Math.max(0, v.limit - v.uses), 0))} change="Sebelum batas kampanye" />
        <MetricCard label="Pesanan teratribusi" value="12%" change="Periode pelaporan demo" icon={<TicketCheck size={14} />} />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}
      {creating && (
        <form className="card panel" onSubmit={create}>
          <div className="panel-header">
            <h2 className="panel-title">Voucher demo baru</h2>
            <button className="table-action" type="button" onClick={() => setCreating(false)} aria-label="Tutup formulir"><X size={13} /></button>
          </div>
          <div className="form-grid" style={{ padding: 18 }}>
            <div className="field"><label className="label" htmlFor="v-code">Kode</label><input className="input" id="v-code" name="code" placeholder="HEMAT20K" required /></div>
            <div className="field"><label className="label" htmlFor="v-type">Tipe</label><select className="select" id="v-type" name="type"><option value="Persen">Persen</option><option value="Nominal">Nominal</option></select></div>
            <div className="field"><label className="label" htmlFor="v-value">Nilai</label><input className="input" id="v-value" name="value" type="number" min="1" placeholder="10" /></div>
            <div className="field"><label className="label" htmlFor="v-limit">Batas penggunaan</label><input className="input" id="v-limit" name="limit" type="number" min="1" placeholder="50" /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><button className="button button-primary" type="submit" style={{ width: "100%" }}>Simpan voucher</button></div>
          </div>
        </form>
      )}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kode voucher…" /></div>
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
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={8} className="muted" style={{ textAlign: "center" }}>Belum ada voucher.</td></tr>
              ) : rows.map((v) => (
                <tr key={v.code}>
                  <td className="table-primary">{v.code}</td>
                  <td>{v.type}</td>
                  <td>{v.type === "Persen" ? `${v.value}%` : formatIDR(v.value)}</td>
                  <td className="tabular">{v.uses}</td>
                  <td className="tabular">{v.limit}</td>
                  <td>{formatDateID(v.expires)}</td>
                  <td>
                    <button
                      className={`toggle ${v.active ? "on" : ""}`}
                      type="button"
                      onClick={() => unavailable(`Toggle ${v.code}`)}
                      disabled={!DEMO_MODE}
                    />
                  </td>
                  <td>
                    <button className="table-action" aria-label={`Opsi untuk ${v.code}`} onClick={() => unavailable(`Opsi untuk ${v.code}`)} disabled={!DEMO_MODE}><MoreHorizontal size={13} /></button>
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