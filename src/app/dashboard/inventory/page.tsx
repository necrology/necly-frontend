"use client";

import { AlertTriangle, Boxes, CalendarClock, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { services } from "@/data/seed";
import { adminApi, bootstrapAuth, catalogApi, DEMO_MODE } from "@/lib/api";
import { mapApiInventoryAccount } from "@/lib/admin-mappers";
import { mapApiProduct } from "@/lib/product-mapper";
import type { InventoryAccount } from "@/lib/types";

/**
 * Slot dicatat per harga paket, bukan per produk: katalog menghitung
 * ketersediaan dari baris inventory_slots berstatus available untuk satu
 * product_price, dan checkout mengunci baris yang sama. Satu baris tabel karena
 * itu mewakili satu paket durasi.
 */
type SlotRow = {
  key: string;
  productId: string;
  productName: string;
  operator: string;
  label: string;
  priceId: string;
  stock: number;
};

const DEFAULT_SLOT_QUANTITY = 10;

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SlotRow[]>(() =>
    DEMO_MODE
      ? services.flatMap((product) =>
          product.priceOptions.map((option) => ({
            key: `${product.id}:${option.id}`,
            productId: product.id,
            productName: product.name,
            operator: product.operator.name,
            label: option.label,
            priceId: option.id,
            stock: option.stock ?? 0,
          })),
        )
      : [],
  );
  const [accountsByProduct, setAccountsByProduct] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<SlotRow | null>(null);
  const [quantity, setQuantity] = useState(String(DEFAULT_SLOT_QUANTITY));
  const [credentials, setCredentials] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [catalog, inventory] = await Promise.all([
      catalogApi.listProducts({ per_page: 100 }),
      adminApi.listInventoryAccounts({ page: 1, per_page: 100 }),
    ]);

    const mapped = (catalog.products ?? []).map(mapApiProduct);
    setRows(
      mapped.flatMap((product) =>
        product.priceOptions.map((option) => ({
          key: `${product.id}:${option.id}`,
          productId: product.id,
          productName: product.name,
          operator: product.operator.name,
          label: option.label,
          priceId: option.id,
          stock: option.stock ?? 0,
        })),
      ),
    );

    const accounts = ((inventory.accounts as unknown as Record<string, unknown>[]) ?? []).map(mapApiInventoryAccount);
    setAccountsByProduct(
      Object.fromEntries(accounts.filter((account: InventoryAccount) => account.product).map((account: InventoryAccount) => [account.product, account.id])),
    );
  }, []);

  useEffect(() => {
    if (DEMO_MODE) return;
    bootstrapAuth().then((user) => {
      if (!user || user.role !== "admin") {
        setError("Akses ditolak: hanya admin yang dapat mengelola inventaris");
        setLoading(false);
        return;
      }
      load()
        .catch(() => setError("Gagal memuat inventaris dari server"))
        .finally(() => setLoading(false));
    });
  }, [load]);

  const visibleRows = useMemo(() => rows.filter((row) => `${row.productName} ${row.label}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);

  const total = rows.reduce((sum, row) => sum + row.stock, 0);
  const low = rows.filter((row) => row.stock > 0 && row.stock <= 2).length;
  const waitlist = rows.filter((row) => row.stock === 0).length;

  const openForm = (row: SlotRow) => {
    setForm(row);
    setQuantity(String(DEFAULT_SLOT_QUANTITY));
    setCredentials("");
    setNotice("");
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    // Mode demo hanya mengubah angka di layar; tidak ada API yang dipanggil.
    if (DEMO_MODE) {
      setRows((current) => current.map((row) => (row.key === form.key ? { ...row, stock: row.stock + Number(quantity || 1) } : row)));
      flash(`${quantity} slot demo ditambahkan ke ${form.productName} · ${form.label}.`);
      setForm(null);
      return;
    }

    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      flash("Jumlah slot harus berupa angka antara 1 dan 100.");
      return;
    }

    setSubmitting(true);
    try {
      // Slot wajib menunjuk akun induk, jadi produk yang belum punya akun
      // dibuatkan lebih dulu dari kredensial yang diisi di form yang sama.
      if (!accountsByProduct[form.productId]) {
        if (!credentials.trim()) {
          flash("Isi kredensial akun induk produk ini terlebih dahulu.");
          setSubmitting(false);
          return;
        }
        await adminApi.createInventoryAccount({ product_id: form.productId, credentials: credentials.trim() });
      }

      const result = await adminApi.createInventorySlots({ product_price_id: form.priceId, quantity: amount });
      flash(`${result.created} slot ditambahkan ke ${form.productName} · ${form.label}.`);
      setForm(null);
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Gagal menambahkan slot.");
      await load().catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat inventaris</h2>
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

  const formNeedsAccount = form ? !DEMO_MODE && !accountsByProduct[form.productId] : false;

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Inventaris slot akun"
        description="Kelola kapasitas slot anggota pada akun langganan sharing sebelum ditawarkan ke pelanggan."
        actions={<button className="button button-secondary button-sm" type="button" onClick={() => flash("Kalender ketersediaan belum tersedia.")}><CalendarClock size={13} /> Kalender ketersediaan</button>}
      />
      <section className="metric-grid">
        <MetricCard label="Slot terbuka" value={String(total)} change="Total kapasitas slot aktif" icon={<Boxes size={14} />} />
        <MetricCard label="Ketersediaan rendah" value={String(low)} change="Perlu penambahan akun induk" icon={<AlertTriangle size={14} />} />
        <MetricCard label="Daftar tunggu" value={String(waitlist)} change="Menunggu alokasi akun baru" />
        <MetricCard label="Status inventaris" value={DEMO_MODE ? "Siap sharing" : "Live operasional"} change="Kapasitas akun terpantau" />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}
      {form && (
        <form className="card panel" onSubmit={submit}>
          <div className="panel-header">
            <h2 className="panel-title">Tambah slot — {form.productName} · {form.label}</h2>
            <button className="table-action" type="button" onClick={() => setForm(null)} aria-label="Tutup formulir"><X size={13} /></button>
          </div>
          <div className="form-grid" style={{ padding: 18 }}>
            {formNeedsAccount && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label className="label" htmlFor="inv-credentials">Kredensial akun induk</label>
                <textarea className="input" id="inv-credentials" name="credentials" rows={3} value={credentials} onChange={(event) => setCredentials(event.target.value)} placeholder="Email dan kata sandi akun induk produk ini" />
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 11 }}>Produk ini belum punya akun induk. Kredensialnya disimpan terenkripsi dan tidak pernah ditampilkan kembali.</p>
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="inv-quantity">Jumlah slot</label>
              <input className="input" id="inv-quantity" name="quantity" type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button className="button button-primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Menyimpan…" : formNeedsAccount ? "Simpan akun & tambah slot" : "Tambah slot"}
              </button>
            </div>
          </div>
        </form>
      )}
      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari inventaris…" /></div>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Paket</th>
                <th>Slot terbuka</th>
                <th>Kapasitas</th>
                <th>Status</th>
                <th>Akun induk</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && !loading ? (
                <tr><td colSpan={7} className="muted" style={{ textAlign: "center" }}>Belum ada akun atau slot langganan.</td></tr>
              ) : visibleRows.map((row) => (
                <tr key={row.key}>
                  <td className="table-primary">{row.productName}</td>
                  <td>{row.label}</td>
                  <td className="tabular">{row.stock}</td>
                  <td>
                    <div className="inventory-bar" aria-label={`${row.stock} dari 10 slot tersedia`}>
                      <span style={{ width: `${Math.min(row.stock * 10, 100)}%` }} />
                    </div>
                  </td>
                  <td><StatusBadge status={row.stock === 0 ? "Daftar tunggu" : row.stock <= 2 ? "Rendah" : "Aktif"} /></td>
                  <td>{DEMO_MODE ? row.operator : accountsByProduct[row.productId] ? "Ada" : "Belum ada"}</td>
                  <td>
                    <button className="button button-secondary button-sm" type="button" onClick={() => openForm(row)}>
                      <Plus size={12} /> Slot
                    </button>
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
