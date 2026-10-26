"use client";

import { Edit3, Eye, Plus, Search, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ProductIcon } from "@/components/product-icon";
import { ProductPhoto } from "@/components/product-photo";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusBadge } from "@/components/status-badge";
import { formatIDR } from "@/lib/money";
import { ApiError, adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiProductToSubscriptionProduct } from "@/lib/admin-mappers";
import {
  PRODUCT_IMAGE_ACCEPT,
  compressProductIcon,
  compressProductImage,
  isHttpsImageUrl,
  isProductIconInput,
  validateProductImageFile,
} from "@/lib/product-image";
import { productStatus, productStatusPayload, type ProductStatus } from "@/lib/product-status";
import type { SubscriptionProduct } from "@/lib/types";
import type { ApiProduct } from "@/lib/api";

const categories = ["Semua", "Streaming", "Produktivitas", "Kreatif", "Edukasi", "Keamanan"] as const;
const statusOptions: ProductStatus[] = ["Aktif", "Coming Soon", "Nonaktif"];
const statusFilters = ["Semua status", ...statusOptions] as const;
const fallbackPhoto = "/illustrations/product-workspace.svg";

type CategoryOption = { id: string; name: string };
type PhotoMode = "keep" | "replace" | "remove";

type ProductForm = {
  mode: "create" | "edit";
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  status: ProductStatus;
  imageUrl?: string;
  imageUrlInput: string;
  photoMode: PhotoMode;
  photoValue?: string;
  iconUrl?: string;
  iconUrlInput: string;
  iconMode: PhotoMode;
  iconValue?: string;
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
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("Semua status");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiProducts, setApiProducts] = useState<SubscriptionProduct[] | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [formError, setFormError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [iconError, setIconError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");

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
          (statusFilter === "Semua status" || productStatus(product) === statusFilter) &&
          product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category, statusFilter, renderProducts],
  );

  const openCreate = () => {
    setFormError("");
    setPhotoError("");
    setIconError("");
    setNotice("");
    setForm({
      mode: "create",
      name: "",
      slug: "",
      categoryId: "",
      description: "",
      status: "Aktif",
      imageUrlInput: "",
      photoMode: "keep",
      iconUrlInput: "",
      iconMode: "keep",
    });
  };

  const openEdit = (product: SubscriptionProduct) => {
    setFormError("");
    setPhotoError("");
    setIconError("");
    setNotice("");
    setForm({
      mode: "edit",
      id: product.id,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId ?? "",
      description: product.description,
      status: productStatus(product),
      imageUrl: product.imageUrl,
      imageUrlInput: product.imageUrl && isHttpsImageUrl(product.imageUrl) ? product.imageUrl : "",
      photoMode: "keep",
      iconUrl: product.iconUrl,
      iconUrlInput: product.iconUrl && !product.iconUrl.startsWith("data:") ? product.iconUrl : "",
      iconMode: "keep",
    });
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError("");
    const invalid = validateProductImageFile(file);
    if (invalid) {
      setPhotoError(invalid);
      return;
    }
    try {
      const compressed = await compressProductImage(file);
      setForm((current) => current ? { ...current, photoMode: "replace", photoValue: compressed, imageUrlInput: "" } : current);
    } catch (failure) {
      setPhotoError(failure instanceof Error ? failure.message : "Foto gagal diproses.");
    }
  };

  const handleIconFile = async (file: File | undefined) => {
    if (!file) return;
    setIconError("");
    const invalid = validateProductImageFile(file);
    if (invalid) {
      setIconError(invalid.replace("foto", "icon"));
      return;
    }
    try {
      const compressed = await compressProductIcon(file);
      setForm((current) => current ? { ...current, iconMode: "replace", iconValue: compressed, iconUrlInput: "" } : current);
    } catch (failure) {
      setIconError(failure instanceof Error ? failure.message : "Icon gagal diproses.");
    }
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

    const typedImageUrl = form.imageUrlInput.trim();
    if (typedImageUrl && !isHttpsImageUrl(typedImageUrl)) {
      setFormError("URL foto harus diawali dengan https://.");
      return;
    }

    let imageUrlToSend: string | undefined;
    if (form.photoMode === "remove") {
      imageUrlToSend = "";
    } else if (form.photoMode === "replace") {
      imageUrlToSend = form.photoValue ?? (isHttpsImageUrl(typedImageUrl) ? typedImageUrl : undefined);
      if (!imageUrlToSend) {
        setFormError("Pilih file foto atau isi URL foto yang valid.");
        return;
      }
    }

    const typedIconUrl = form.iconUrlInput.trim();
    if (typedIconUrl && !isProductIconInput(typedIconUrl)) {
      setFormError("URL icon harus diawali https:// atau berupa path /design-assets/....");
      return;
    }

    let iconUrlToSend: string | undefined;
    if (form.iconMode === "remove") {
      iconUrlToSend = "";
    } else if (form.iconMode === "replace") {
      iconUrlToSend = form.iconValue ?? (isProductIconInput(typedIconUrl) ? typedIconUrl : undefined);
      if (!iconUrlToSend) {
        setFormError("Pilih file icon atau isi URL/path icon yang valid.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        slug,
        category_id: form.categoryId,
        description: form.description.trim(),
        ...productStatusPayload(form.status),
      };
      // Saat edit tanpa mengganti foto/icon, field terkait tidak dikirim agar
      // backend tidak menimpa nilai lama. Hapus dikirim sebagai string kosong.
      if (imageUrlToSend !== undefined) payload.image_url = imageUrlToSend;
      if (iconUrlToSend !== undefined) payload.icon_url = iconUrlToSend;

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

  const changeStatus = async (product: SubscriptionProduct, nextStatus: ProductStatus) => {
    if (DEMO_MODE || statusUpdatingId) return;
    setStatusError("");
    setStatusUpdatingId(product.id);
    try {
      await adminApi.updateProduct(product.id, productStatusPayload(nextStatus));
      setNotice(`Status ${product.name} diubah menjadi ${nextStatus}.`);
      await loadProducts();
    } catch (failure) {
      setStatusError(
        failure instanceof ApiError
          ? `Gagal mengubah status ${product.name}: ${failure.message}`
          : `Gagal mengubah status ${product.name}.`,
      );
    } finally {
      setStatusUpdatingId(null);
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

  const photoSrc = form
    ? form.photoMode === "remove"
      ? undefined
      : form.photoMode === "replace"
        ? form.photoValue ?? form.imageUrlInput
        : form.imageUrl
    : undefined;

  const iconSrc = form
    ? form.iconMode === "remove"
      ? undefined
      : form.iconMode === "replace"
        ? form.iconValue ?? (isProductIconInput(form.iconUrlInput) ? form.iconUrlInput.trim() : undefined)
        : form.iconUrl
    : undefined;

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Produk akun sharing"
        description="Kelola paket akun langganan sharing, harga, ketersediaan akses anggota, dan status tayang agar pelanggan bisa berlangganan lebih hemat."
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
      {statusError && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{statusError}</div>}
      {form && (
        <Modal
          title={form.mode === "create" ? "Produk baru" : `Edit ${form.name}`}
          description="Lengkapi data produk, foto, dan icon yang tampil di katalog."
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={() => setForm(null)} disabled={submitting}>
                Batal
              </button>
              <button className="button button-primary" type="submit" form="product-form" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Simpan produk"}
              </button>
            </>
          }
        >
          <form id="product-form" onSubmit={submit} aria-label={form.mode === "create" ? "Form produk baru" : "Form edit produk"}>
            <div className="form-grid">
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
                <SearchableSelect
                  inputId="p-category"
                  ariaLabel="Kategori"
                  value={form.categoryId}
                  onChange={(value) => setForm({ ...form, categoryId: value })}
                  placeholder="Pilih kategori"
                  options={categoryOptions.map((option) => ({ value: option.id, label: option.name }))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="p-status">Status produk</label>
                <SearchableSelect
                  inputId="p-status"
                  ariaLabel="Status produk"
                  value={form.status}
                  onChange={(value) => setForm({ ...form, status: value as ProductStatus })}
                  options={statusOptions.map((status) => ({ value: status, label: status }))}
                />
                <span className="table-secondary">Coming Soon tampil di katalog, tetapi tidak bisa dipesan.</span>
              </div>
              <div className="field field-full">
                <label className="label" htmlFor="p-description">Deskripsi</label>
                <textarea
                  className="input"
                  id="p-description"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
              <div className="field field-full">
                <span className="label">Foto produk</span>
                <div className="product-photo-field">
                  <div className="product-photo-frame">
                    <ProductPhoto src={photoSrc} alt={`Pratinjau foto ${form.name || "produk"}`} fallbackSrc={fallbackPhoto} />
                  </div>
                  <div className="product-photo-controls">
                    <div className="product-photo-actions">
                      <input
                        className="sr-only"
                        id="p-photo"
                        type="file"
                        accept={PRODUCT_IMAGE_ACCEPT}
                        aria-label="Pilih foto produk"
                        onChange={(event) => {
                          void handlePhotoFile(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <label className="button button-secondary button-sm" htmlFor="p-photo"><Upload size={13} /> Pilih file</label>
                      {(photoSrc || form.imageUrl) && (
                        <button
                          className="button button-secondary button-sm"
                          type="button"
                          onClick={() => setForm({ ...form, photoMode: "remove", photoValue: undefined, imageUrlInput: "" })}
                        >
                          <Trash2 size={13} /> Hapus foto
                        </button>
                      )}
                    </div>
                    <p className="table-secondary" style={{ margin: 0 }}>
                      JPG, PNG, atau WebP maksimal 2 MB. Foto dikompres otomatis di browser (sisi terpanjang 1000 px).
                    </p>
                    {form.photoMode === "remove" && <p className="table-secondary" style={{ margin: 0 }}>Foto akan dihapus saat produk disimpan.</p>}
                    {photoError && <p className="field-error" role="alert" style={{ margin: 0 }}>{photoError}</p>}
                  </div>
                </div>
              </div>
              <div className="field field-full">
                <label className="label" htmlFor="p-image-url">URL foto (opsional)</label>
                <input
                  className="input"
                  id="p-image-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://contoh.com/foto-produk.jpg"
                  value={form.imageUrlInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm({
                      ...form,
                      imageUrlInput: value,
                      photoMode: value.trim() ? "replace" : "keep",
                      photoValue: undefined,
                    });
                  }}
                />
                <span className="table-secondary">Gunakan URL https:// bila foto sudah dihosting. Kosongkan bila tidak ingin mengganti foto.</span>
              </div>
              <div className="field field-full">
                <span className="label">Icon produk</span>
                <div className="product-photo-field">
                  <div className="product-icon-frame">
                    <ProductIcon
                      iconUrl={iconSrc}
                      name={form.name || "produk"}
                      width={64}
                      height={44}
                      fallback={<span className="table-secondary">Belum ada icon</span>}
                    />
                  </div>
                  <div className="product-photo-controls">
                    <div className="product-photo-actions">
                      <input
                        className="sr-only"
                        id="p-icon"
                        type="file"
                        accept={PRODUCT_IMAGE_ACCEPT}
                        aria-label="Pilih icon produk"
                        onChange={(event) => {
                          void handleIconFile(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <label className="button button-secondary button-sm" htmlFor="p-icon"><Upload size={13} /> Pilih icon</label>
                      {(iconSrc || form.iconUrl) && (
                        <button
                          className="button button-secondary button-sm"
                          type="button"
                          onClick={() => setForm({ ...form, iconMode: "remove", iconValue: undefined, iconUrlInput: "" })}
                        >
                          <Trash2 size={13} /> Hapus icon
                        </button>
                      )}
                    </div>
                    <p className="table-secondary" style={{ margin: 0 }}>
                      JPG, PNG, atau WebP maksimal 2 MB. Icon dikompres ke sisi terpanjang 256 px (WebP) agar ringan.
                    </p>
                    {form.iconMode === "remove" && <p className="table-secondary" style={{ margin: 0 }}>Icon akan dihapus saat produk disimpan.</p>}
                    {iconError && <p className="field-error" role="alert" style={{ margin: 0 }}>{iconError}</p>}
                  </div>
                </div>
              </div>
              <div className="field field-full">
                <label className="label" htmlFor="p-icon-url">URL atau path icon (opsional)</label>
                <input
                  className="input"
                  id="p-icon-url"
                  type="text"
                  inputMode="url"
                  placeholder="https://contoh.com/icon.webp atau /design-assets/logo.png"
                  value={form.iconUrlInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm({
                      ...form,
                      iconUrlInput: value,
                      iconMode: value.trim() ? "replace" : "keep",
                      iconValue: undefined,
                    });
                  }}
                />
                <span className="table-secondary">Kosongkan bila tidak ingin mengganti icon. Gunakan https:// atau path aset publik.</span>
              </div>
              {formError && <div className="field field-full" style={{ color: "var(--danger)" }} role="alert">{formError}</div>}
            </div>
          </form>
        </Modal>
      )}
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk…" />
        </div>
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter kategori"
          options={categories.map((item) => ({ value: item, label: item }))}
          value={category}
          onChange={setCategory}
        />
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter status"
          options={statusFilters.map((item) => ({ value: item, label: item }))}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as (typeof statusFilters)[number])}
        />
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} hasil</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Icon</th>
                <th>Produk</th>
                <th>Status</th>
                <th>Kategori</th>
                <th>Harga awal</th>
                <th>Ketersediaan akses</th>
                <th>Pengelola akun</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={9} className="muted" style={{ textAlign: "center" }}>Belum ada produk akun sharing.</td></tr>
              ) : rows.map((product) => {
                const status = productStatus(product);
                return (
                  <tr key={product.id}>
                    <td>
                      <ProductPhoto
                        className="product-thumb"
                        src={product.imageUrl}
                        alt={`Foto ${product.name}`}
                        fallbackSrc={fallbackPhoto}
                      />
                    </td>
                    <td>
                      <span className="icon-cell">
                        <ProductIcon
                          iconUrl={product.iconUrl}
                          name={product.name}
                          width={40}
                          height={28}
                          fallback={<span className="table-secondary">—</span>}
                        />
                      </span>
                    </td>
                    <td>
                      <span className="table-primary">{product.name}</span>
                      <br />
                      <span className="table-secondary">{product.id}</span>
                    </td>
                    <td>
                      <StatusBadge status={status} />
                      <SearchableSelect
                        className="table-status-select"
                        ariaLabel={`Ubah status ${product.name}`}
                        value={status}
                        onChange={(value) => void changeStatus(product, value as ProductStatus)}
                        options={statusOptions.map((item) => ({ value: item, label: item }))}
                        isDisabled={DEMO_MODE || statusUpdatingId === product.id}
                      />
                      {statusUpdatingId === product.id && <span className="table-secondary" style={{ marginLeft: 6 }}>Menyimpan…</span>}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
