"use client";

import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { useSearchQueryParam } from "@/lib/use-search-query-param";

type ManagedCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
};

type CategoryForm = {
  mode: "create" | "edit";
  id?: string;
  name: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  active: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function categoryFromResponse(raw: unknown): ManagedCategory | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (!id || !name || !slug) return null;
  return {
    id,
    name,
    slug,
    description: typeof value.description === "string" ? value.description : "",
    active: value.active !== false,
  };
}

function errorMessage(failure: unknown, fallback: string) {
  return failure instanceof ApiError ? failure.message : fallback;
}

export default function DashboardCategoriesPage() {
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useSearchQueryParam(setQuery);
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedCategory | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await bootstrapAuth();
      if (!user) {
        setError("Sesi tidak valid. Silakan masuk kembali.");
        return;
      }
      if (user.role !== "admin") {
        setError("Akses ditolak: hanya admin yang dapat mengelola kategori.");
        return;
      }

      const response = await adminApi.listCategories({ page: 1, per_page: 100 });
      if (!Array.isArray(response.categories)) {
        setError("Respons kategori dari server tidak sesuai kontrak.");
        return;
      }
      setCategories(
        response.categories
          .map(categoryFromResponse)
          .filter((item): item is ManagedCategory => item !== null),
      );
    } catch (failure) {
      setError(errorMessage(failure, "Gagal memuat kategori dari server."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(() => loadCategories());
  }, [loadCategories]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    if (!normalized) return categories;
    return categories.filter((item) =>
      `${item.name} ${item.slug} ${item.description}`.toLocaleLowerCase("id-ID").includes(normalized),
    );
  }, [categories, query]);

  const openCreate = () => {
    setFormError("");
    setActionError("");
    setNotice("");
    setForm({
      mode: "create",
      name: "",
      slug: "",
      slugEdited: false,
      description: "",
      active: true,
    });
  };

  const openEdit = (category: ManagedCategory) => {
    setFormError("");
    setActionError("");
    setNotice("");
    setForm({
      mode: "edit",
      id: category.id,
      name: category.name,
      slug: category.slug,
      slugEdited: true,
      description: category.description,
      active: category.active,
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setFormError("");

    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name || !slug) {
      setFormError("Nama dan slug kategori wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      if (form.mode === "create") {
        const created = await adminApi.createCategory({
          name,
          slug,
          description: form.description.trim(),
        });
        // Endpoint create selalu membuat kategori aktif. Bila operator memilih
        // nonaktif, status dikoreksi lewat PATCH setelah record dibuat.
        if (!form.active && created?.id) {
          try {
            await adminApi.updateCategory(created.id, { active: false });
          } catch (failure) {
            setForm(null);
            await loadCategories();
            setActionError(
              `Kategori ${name} dibuat, tetapi status nonaktif gagal disimpan: ${errorMessage(failure, "kesalahan server")}`,
            );
            return;
          }
        }
        setNotice(`Kategori ${name} dibuat.`);
      } else if (form.id) {
        await adminApi.updateCategory(form.id, {
          name,
          slug,
          description: form.description.trim(),
          active: form.active,
        });
        setNotice(`Kategori ${name} diperbarui.`);
      }
      setForm(null);
      await loadCategories();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        setFormError("Slug kategori sudah digunakan. Pilih slug lain.");
      } else {
        setFormError(`Gagal menyimpan kategori: ${errorMessage(failure, "kesalahan server")}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminApi.deleteCategory(deleteTarget.id);
      setNotice(`Kategori ${deleteTarget.name} dihapus.`);
      setDeleteTarget(null);
      await loadCategories();
    } catch (failure) {
      // Backend dapat menolak penghapusan kategori yang masih dipakai produk.
      // Tampilkan pesan server apa adanya agar operator tahu penyebabnya.
      setDeleteError(
        failure instanceof ApiError
          ? `Kategori gagal dihapus: ${failure.message}`
          : "Kategori gagal dihapus.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }} role="alert">
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat kategori</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{error}</p>
          <button className="button button-primary button-sm" onClick={() => void loadCategories()} style={{ minWidth: 160 }}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Master kategori"
        description="Kelola kategori produk agar pilihan kategori pada produk dan akun selalu tersedia dan konsisten."
        actions={
          <button
            className="button button-primary button-sm"
            onClick={openCreate}
            disabled={DEMO_MODE}
            title={DEMO_MODE ? "Mode demo tidak menyimpan kategori baru" : undefined}
          >
            <Plus size={13} /> Tambah kategori
          </button>
        }
      />

      {notice && <div className="notice success" role="status">{notice}</div>}
      {actionError && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{actionError}</div>}

      {form && (
        <Modal
          title={form.mode === "create" ? "Kategori baru" : `Edit ${form.name}`}
          description="Kategori dipakai saat menambah produk dan data akun terkait."
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={() => setForm(null)} disabled={submitting}>
                Batal
              </button>
              <button className="button button-primary" type="submit" form="category-form" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Simpan kategori"}
              </button>
            </>
          }
        >
          <form
            id="category-form"
            className="form-grid"
            onSubmit={submit}
            aria-label={form.mode === "create" ? "Form kategori baru" : "Form edit kategori"}
          >
            <div className="field">
              <label className="label" htmlFor="c-name">Nama kategori</label>
              <input
                className="input"
                id="c-name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm({
                    ...form,
                    name,
                    slug: form.slugEdited ? form.slug : slugify(name),
                  });
                }}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="c-slug">Slug</label>
              <input
                className="input"
                id="c-slug"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value, slugEdited: true })}
                placeholder={slugify(form.name) || "slug-kategori"}
                required
              />
              <span className="table-secondary">Otomatis dari nama, tetapi tetap bisa diedit.</span>
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="c-description">Deskripsi</label>
              <textarea
                className="input"
                id="c-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="field field-full">
              <label className="check-row" htmlFor="c-active">
                <input
                  id="c-active"
                  type="checkbox"
                  aria-label="Kategori aktif"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                />
                <span>
                  <strong style={{ display: "block", fontSize: 11 }}>Kategori aktif</strong>
                  <span className="table-secondary">Kategori nonaktif tidak ditawarkan untuk produk baru.</span>
                </span>
              </label>
            </div>
            {formError && <div className="field field-full field-error" role="alert">{formError}</div>}
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          role="alertdialog"
          title={`Hapus kategori "${deleteTarget.name}"?`}
          description="Tindakan ini tidak dapat dibatalkan."
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
          footer={
            <>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                disabled={deleting}
              >
                Batal
              </button>
              <button className="button button-primary" type="button" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "Menghapus…" : "Hapus kategori"}
              </button>
            </>
          }
        >
          <p className="muted small" style={{ margin: 0 }}>
            Kategori yang masih dipakai produk dapat ditolak atau gagal dihapus oleh server. Pesan dari server akan ditampilkan di sini.
          </p>
          {deleteError && <p className="field-error" role="alert" style={{ margin: "12px 0 0" }}>{deleteError}</p>}
        </Modal>
      )}

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, slug, atau deskripsi…"
            aria-label="Cari kategori"
          />
        </div>
        <span className="muted" style={{ fontSize: 9 }}>{filtered.length} kategori</span>
        {loading && <span className="skeleton" style={{ width: 70, height: 16 }} />}
      </div>

      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table" aria-label="Daftar kategori">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Slug</th>
                <th>Deskripsi</th>
                <th>Status</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: "center" }} role="status">Memuat kategori…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                    {query.trim()
                      ? "Kategori tidak ditemukan. Coba kata kunci lain."
                      : "Belum ada kategori. Tambahkan kategori pertama agar produk dapat memilih kategori."}
                  </td>
                </tr>
              ) : filtered.map((category) => (
                <tr key={category.id}>
                  <td className="table-primary">{category.name}</td>
                  <td><code>{category.slug}</code></td>
                  <td style={{ maxWidth: 320, whiteSpace: "normal" }}>{category.description || "—"}</td>
                  <td><StatusBadge status={category.active ? "Aktif" : "Nonaktif"} /></td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="table-action"
                        type="button"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => openEdit(category)}
                        disabled={DEMO_MODE}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="table-action"
                        type="button"
                        aria-label={`Hapus ${category.name}`}
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(category);
                        }}
                        disabled={DEMO_MODE}
                      >
                        <Trash2 size={13} />
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
