"use client";

import { Edit3, Eye, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatIDR } from "@/lib/money";
import { ApiError, adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiProductToSubscriptionProduct } from "@/lib/admin-mappers";
import type { SubscriptionProduct } from "@/lib/types";
import type { ApiProduct } from "@/lib/api";

const categories = ["Semua", "Streaming", "Produktivitas", "Kreatif", "Edukasi", "Keamanan"] as const;

type CategoryOption = { id: string; name: string };

type ProductForm = {
  mode: "create" | "edit";
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function DashboardProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiProducts, setApiProducts] = useState<SubscriptionProduct[] | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi tidak valid. Silakan masuk kembali.");
        return;
      }
      if (user.role !== "admin") {
        setError("Akses ditolak: hanya admin yang dapat mengelola produk");
        return;
      }

      const [productsResponse, categoriesResponse] = await Promise.all([
        adminApi.listProducts({ page: 1, per_page: 100 }),
        adminApi.listCategories({ page: 1, per_page: 100 }),
      ]);
      if (!Array.isArray(productsResponse.products)) {
        setError("Respons produk dari server tidak sesuai kontrak");
        return;
      }

      const products = (productsResponse.products as unknown as ApiProduct[]).map(mapApiProductToSubscriptionProduct);
      setApiProducts(products);
      const rawCategories = Array.isArray(categoriesResponse.categories)
        ? (categoriesResponse.categories as Record<string, unknown>[])
        : [];
      setCategoryOptions(
        rawCategories
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map((item) => ({ id: String(item.id ?? ""), name: String(item.name ?? "") }))
          .filter((item) => item.id && item.name),
      );
    } catch {
      setError("Gagal memuat produk dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(() => loadProducts());
  }, [loadProducts]);

  const [demoProducts, setDemoProducts] = useState<SubscriptionProduct[]>([]);
  useEffect(() => {
    if (DEMO_MODE) {
      import("@/data/seed").then((mod) => setDemoProducts(mod.services));
    }
  }, []);

  const renderProducts = useMemo(
    () => (DEMO_MODE ? demoProducts : apiProducts ?? []),
    [demoProducts, apiProducts],
  );

  const rows = useMemo(
    () =>
      renderProducts.filter(
        (product) =>
          (category === "Semua" || product.category === category) &&
          product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category, renderProducts],
  );

  const openCreate = () => {
    setFormError("");
    setNotice("");
    setForm({
      mode: "create",
      name: "",
      slug: "",
      categoryId: "",
      description: "",
    });
  };

  const openEdit = (product: SubscriptionProduct) => {
    setFormError("");
    setNotice("");
    setForm({
      mode: "edit",
      id: product.id,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId ?? "",
      description: product.description,
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setFormError("");
    const name = form.name.trim();
    const slug = form.slug.trim() || slugify(name);
    if (!name || !slug) {
      setFormError("Nama dan slug produk wajib diisi.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Pilih kategori produk terlebih dahulu.");
      return;
    }
    if (form.mode === "edit" && !form.description.trim()) {
      // Backend mempertahankan deskripsi lama saat menerima string kosong;
      // hentikan di UI agar operator tidak mengira deskripsi sudah dihapus.
      setFormError("Deskripsi tidak dapat dikosongkan saat edit. Isi deskripsi baru atau batalkan perubahan.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        slug,
        category_id: form.categoryId,
        description: form.description.trim(),
      };
      if (form.mode === "create") {
        await adminApi.createProduct(payload);
        setNotice(`Produk ${name} dibuat. Tambahkan harga dan akses lewat halaman inventaris.`);
      } else if (form.id) {
        await adminApi.updateProduct(form.id, payload);
        setNotice(`Produk ${name} diperbarui.`);
      }
      setForm(null);
      await loadProducts();
    } catch (failure) {
      setFormError(
        failure instanceof ApiError
          ? `Gagal menyimpan produk: ${failure.message}`
          : "Gagal menyimpan produk.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }} role="alert">
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat produk</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{error}</p>
          <button className="button button-primary button-sm" onClick={() => void loadProducts()} style={{ minWidth: 160 }}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Produk akun sharing"
        description="Kelola paket akun langganan sharing, harga, dan ketersediaan akses anggota agar pelanggan bisa berlangganan lebih hemat."
        actions={
          <button
            className="button button-primary button-sm"
            onClick={openCreate}
            disabled={DEMO_MODE}
            title={DEMO_MODE ? "Mode demo tidak menyimpan produk baru" : undefined}
          >
            <Plus size={13} /> Tambah produk
          </button>
        }
      />
      {notice && <div className="notice success" role="status">{notice}</div>}
      {form && (
        <form className="card panel" onSubmit={submit}>
          <div className="panel-header">
            <h2 className="panel-title">{form.mode === "create" ? "Produk baru" : `Edit ${form.name}`}</h2>
            <button className="table-action" type="button" onClick={() => setForm(null)} aria-label="Tutup formulir">
              <X size={13} />
            </button>
          </div>
          <div className="form-grid" style={{ padding: 18 }}>
            <div className="field">
              <label className="label" htmlFor="p-name">Nama produk</label>
              <input
                className="input"
                id="p-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="p-slug">Slug</label>
              <input
                className="input"
                id="p-slug"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder={slugify(form.name) || "slug-produk"}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="p-category">Kategori</label>
              <select
                className="select"
                id="p-category"
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
                <option value="">Pilih kategori</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="p-description">Deskripsi</label>
              <textarea
                className="input"
                id="p-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            {formError && <div className="field" style={{ gridColumn: "1 / -1", color: "var(--danger)" }} role="alert">{formError}</div>}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <button className="button button-primary" type="submit" style={{ width: "100%" }} disabled={submitting}>
                {submitting ? "Menyimpan…" : "Simpan produk"}
              </button>
            </div>
          </div>
        </form>
      )}
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk…" />
        </div>
        <select className="select" style={{ width: 170 }} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} hasil</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga awal</th>
                <th>Ketersediaan akses</th>
                <th>Pengelola akun</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Belum ada produk akun sharing.</td></tr>
              ) : rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className="table-primary">{product.name}</span>
                    <br />
                    <span className="table-secondary">{product.id}</span>
                  </td>
                  <td>{product.category}</td>
                  <td className="tabular">{formatIDR(product.price)}</td>
                  <td>
                    <StatusBadge status={product.stock > 0 ? "Aktif" : "Daftar tunggu"} />
                    <span className="table-secondary" style={{ marginLeft: 7 }}>{product.stock} akses</span>
                  </td>
                  <td>{product.operator.name}</td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="table-action"
                        href={`/products/${encodeURIComponent(product.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Pratinjau ${product.name}`}
                      >
                        <Eye size={13} />
                      </Link>
                      <button
                        className="table-action"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => openEdit(product)}
                        disabled={DEMO_MODE || categoryOptions.length === 0}
                        title={DEMO_MODE ? "Mode demo tidak menyimpan perubahan" : undefined}
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
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
