"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  LogIn,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, bootstrapAuth, checkoutApi, DEMO_MODE, type ApiOrder } from "@/lib/api";
import { formatDateTimeID, formatIDR } from "@/lib/money";

const PER_PAGE = 5;
const ARCHIVABLE_STATUSES = new Set([
  "pending_payment",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
]);

type LoadError = {
  kind: "unauthorized" | "generic";
  message: string;
};

type ArchiveRequest = {
  orders: ApiOrder[];
};

/**
 * Hanya dipakai ketika NEXT_PUBLIC_DEMO_MODE=true. Mode live selalu memanggil
 * API dan tidak pernah mengganti kegagalan dengan pesanan contoh.
 */
const DEMO_ORDERS: ApiOrder[] = [
  {
    id: "demo-order-1",
    number: "NCL-DEMO-260906",
    status: "processing",
    subtotal: 109_000,
    discount: 0,
    total: 109_000,
    currency: "IDR",
    payment_due_at: "2026-09-07T10:00:00Z",
    created_at: "2026-09-06T10:00:00Z",
    updated_at: "2026-09-06T10:04:00Z",
    items: [
      {
        id: "demo-item-1",
        product_price_id: "demo-price-1",
        product_name: "StreamFlix Keluarga (Demo)",
        duration_name: "3 bulan",
        unit_price: 109_000,
        quantity: 1,
        device_count: 1,
        line_total: 109_000,
      },
    ],
  },
  {
    id: "demo-order-2",
    number: "NCL-DEMO-260905",
    status: "paid",
    subtotal: 32_000,
    discount: 0,
    total: 32_000,
    currency: "IDR",
    payment_due_at: "2026-09-06T10:00:00Z",
    created_at: "2026-09-05T10:00:00Z",
    updated_at: "2026-09-05T10:05:00Z",
    items: [
      {
        id: "demo-item-2",
        product_price_id: "demo-price-2",
        product_name: "CineMax Anggota Keluarga (Demo)",
        duration_name: "1 bulan",
        unit_price: 32_000,
        quantity: 1,
        device_count: 1,
        line_total: 32_000,
      },
    ],
  },
];

function canArchiveOrder(order: ApiOrder) {
  return ARCHIVABLE_STATUSES.has(order.status.toLowerCase());
}

function itemSummary(order: ApiOrder) {
  const items = order.items ?? [];
  if (items.length === 0) return "Detail layanan tersedia di halaman pesanan.";
  const names = items.slice(0, 2).map((item) => item.product_name).join(", ");
  return items.length > 2 ? `${names}, +${items.length - 2} layanan lain` : names;
}

function errorFromFailure(error: unknown): LoadError {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    return {
      kind: "unauthorized",
      message: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat riwayat pesanan.",
    };
  }
  return {
    kind: "generic",
    message: "Gagal memuat riwayat pesanan. Periksa koneksi Anda lalu coba lagi.",
  };
}

function archiveErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "Pesanan aktif atau sedang diproses tidak dapat dihapus dari riwayat.";
  }
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    return "Sesi Anda sudah berakhir. Masuk kembali lalu coba hapus riwayat pesanan ini.";
  }
  return "Gagal menghapus pesanan dari riwayat. Periksa koneksi Anda lalu coba lagi.";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validasi runtime satu item pesanan. TypeScript hanya memeriksa bentuk saat
 * compile-time, sedangkan JSON dari server tidak pernah divalidasi compiler.
 * `product_name` dipakai ringkasan daftar, jadi wajib ada agar tidak muncul
 * baris kosong/`undefined` di UI.
 */
function isValidOrderItem(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isNonEmptyString(item.product_name);
}

/**
 * Validasi runtime satu elemen `orders[]`. Payload HTTP-success bisa lolos
 * `Array.isArray` tetapi tiap elemennya tidak sesuai kontrak; merendernya
 * menghasilkan `RpNaN`, tautan `/orders/undefined`, tanggal kosong, dan React
 * warning karena `key` tidak unik. Field di bawah adalah yang benar-benar
 * dipakai render, jadi minimal itu yang harus diperiksa.
 */
function isValidOrder(value: unknown): value is ApiOrder {
  if (value === null || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return (
    isNonEmptyString(order.id) &&
    isNonEmptyString(order.number) &&
    isNonEmptyString(order.status) &&
    isNonEmptyString(order.created_at) &&
    typeof order.total === "number" &&
    Number.isFinite(order.total) &&
    Array.isArray(order.items) &&
    order.items.every(isValidOrderItem)
  );
}

export function OrderHistoryClient() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [archiveRequest, setArchiveRequest] = useState<ArchiveRequest | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [copiedOrderId, setCopiedOrderId] = useState("");
  const [copyError, setCopyError] = useState("");
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Dipakai saat page saat ini sudah melewati halaman terakhir (total
    // menyusut antar-request). Kita pindah ke page terakhir dan fetch ulang,
    // jadi loading sengaja tetap aktif sampai fetch ulang selesai.
    let redirectedToLastPage = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      if (DEMO_MODE) {
        setOrders(DEMO_ORDERS);
        setTotal(DEMO_ORDERS.length);
        setLoading(false);
        return;
      }

      try {
        // Token akses hanya hidup di memori. Setelah pembayaran pengguna bisa
        // kembali lewat tautan atau reload, jadi sesi dipulihkan lebih dulu.
        const user = await bootstrapAuth();
        if (cancelled) return;
        if (!user) {
          setOrders([]);
          setTotal(0);
          setError({
            kind: "unauthorized",
            message: "Masuk untuk melihat seluruh riwayat pesanan Anda.",
          });
          return;
        }

        const response = await checkoutApi.listOrders({ page, per_page: PER_PAGE });
        if (cancelled) return;

        if (!Array.isArray(response.orders) || !response.orders.every(isValidOrder)) {
          setOrders([]);
          setTotal(0);
          setError({
            kind: "generic",
            message: "Respons riwayat pesanan dari server tidak sesuai kontrak.",
          });
          return;
        }

        const safeTotal = Number.isFinite(response.total)
          ? response.total
          : response.orders.length;
        // Total bisa menyusut di antara dua request (mis. pesanan dibatalkan
        // di tab lain). Jangan commit daftar kosong dari page yang sudah tidak
        // valid: turun ke halaman terakhir yang masih ada lalu fetch ulang.
        const lastPage = Math.max(1, Math.ceil(safeTotal / PER_PAGE));
        if (page > lastPage) {
          redirectedToLastPage = true;
          setPage(lastPage);
          return;
        }

        setOrders(response.orders);
        setTotal(safeTotal);
      } catch (failure) {
        if (cancelled) return;
        setOrders([]);
        setTotal(0);
        setError(errorFromFailure(failure));
      } finally {
        if (!cancelled && !redirectedToLastPage) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);
  const firstRow = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const lastRow = Math.min(page * PER_PAGE, total);
  const archivableOrders = useMemo(() => orders.filter(canArchiveOrder), [orders]);
  const selectedOrders = useMemo(
    () => archivableOrders.filter((order) => selectedIds.has(order.id)),
    [archivableOrders, selectedIds],
  );
  const allSelected = archivableOrders.length > 0 && selectedOrders.length === archivableOrders.length;
  const someSelected = selectedOrders.length > 0 && !allSelected;
  const archiveCount = archiveRequest?.orders.length ?? 0;

  // Pilihan selalu dipakai lewat irisan dengan pesanan yang tampil, sehingga
  // ID dari halaman lama tidak ikut terhitung. Pindah halaman membersihkan
  // pilihan; pesanan yang gagal diarsipkan tetap terpilih untuk dicoba lagi.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  function changePage(nextPage: number) {
    setSelectedIds(new Set());
    setPage(nextPage);
  }

  function toggleOrderSelection(orderId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
    setArchiveNotice("");
  }

  function toggleAllOnPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        for (const order of archivableOrders) next.delete(order.id);
      } else {
        for (const order of archivableOrders) next.add(order.id);
      }
      return next;
    });
    setArchiveNotice("");
  }

  async function copyOrderNumber(order: ApiOrder) {
    setCopyError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API tidak tersedia");
      await navigator.clipboard.writeText(order.number);
      setCopiedOrderId(order.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopiedOrderId((current) => (current === order.id ? "" : current));
      }, 2000);
    } catch {
      setCopiedOrderId("");
      setCopyError(
        `Nomor pesanan ${order.number} tidak dapat disalin otomatis. Pilih teks nomor pesanan lalu salin secara manual.`,
      );
    }
  }

  function closeArchiveDialog() {
    if (archiving) return;
    setArchiveRequest(null);
    setArchiveError(null);
  }

  async function confirmArchive() {
    if (!archiveRequest || archiveRequest.orders.length === 0 || archiving) return;

    setArchiving(true);
    setArchiveError(null);
    setArchiveNotice("");

    const succeeded: ApiOrder[] = [];
    const failed: Array<{ order: ApiOrder; error: unknown }> = [];

    // Arsipkan satu per satu agar kegagalan pada satu pesanan tidak
    // menghentikan pesanan lain, dan UI dapat melaporkan hasil parsial.
    for (const target of archiveRequest.orders) {
      try {
        await checkoutApi.archiveOrder(target.id);
        succeeded.push(target);
      } catch (failure) {
        failed.push({ order: target, error: failure });
      }
    }

    const succeededIds = new Set(succeeded.map((order) => order.id));
    if (succeeded.length > 0) {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const id of succeededIds) next.delete(id);
        return next;
      });
    }

    if (failed.length === 0 && succeeded.length > 0) {
      setArchiveRequest(null);
      setArchiveNotice(
        succeeded.length === 1
          ? "Pesanan berhasil dihapus dari riwayat."
          : `${succeeded.length} pesanan berhasil dihapus dari riwayat.`,
      );

      // Bila seluruh item halaman ini terarsip, halaman tersebut tidak lagi
      // valid. Turun satu halaman agar tidak menampilkan daftar kosong palsu.
      const allVisibleArchived =
        orders.length > 0 && orders.every((order) => succeededIds.has(order.id));
      if (allVisibleArchived && page > 1) setPage((value) => Math.max(1, value - 1));
      else setReloadToken((value) => value + 1);
    } else if (succeeded.length > 0) {
      // Sebagian gagal: tutup dialog, muat ulang daftar agar item yang sudah
      // terarsip hilang, tetapi pesanan yang gagal tetap terlihat dan terpilih.
      setArchiveRequest(null);
      setArchiveError(
        `${succeeded.length} pesanan berhasil dihapus, ${failed.length} gagal dihapus. ${archiveErrorMessage(failed[0].error)}`,
      );
      setReloadToken((value) => value + 1);
    } else {
      setArchiveError(
        failed.length === 1
          ? archiveErrorMessage(failed[0].error)
          : `${failed.length} pesanan gagal dihapus. ${archiveErrorMessage(failed[0].error)}`,
      );
    }

    setArchiving(false);
  }

  return (
    <>
      <header className="page-hero orders-hero">
        <div className="container">
          <span className="eyebrow orders-eyebrow">Pesanan saya</span>
          <h1 className="h1" style={{ marginTop: 12 }}>Riwayat pesanan</h1>
          <p className="lede" style={{ marginTop: 12 }}>
            Semua pesanan yang pernah Anda buat tersimpan di sini, termasuk status pembayaran dan akses layanan.
          </p>
        </div>
      </header>

      <section className="container orders-page" aria-busy={loading}>
        {DEMO_MODE && (
          <div className="demo-banner" role="status">
            <ReceiptText size={16} />
            <span>Mode demo: daftar ini berisi pesanan contoh dan tidak terhubung ke transaksi nyata.</span>
          </div>
        )}

        {loading ? (
          <div className="orders-skeleton" aria-label="Memuat riwayat pesanan" role="status">
            {[0, 1, 2].map((row) => (
              <div className="card order-list-item" key={row}>
                <div className="order-list-main">
                  <span className="skeleton" style={{ width: 180, height: 16 }} />
                  <span className="skeleton" style={{ width: "60%", height: 12 }} />
                </div>
                <div className="order-list-side">
                  <span className="skeleton" style={{ width: 90, height: 16 }} />
                  <span className="skeleton" style={{ width: 110, height: 36 }} />
                </div>
              </div>
            ))}
            <span className="muted small">Memuat pesanan…</span>
          </div>
        ) : error ? (
          <div className="card orders-state" role="alert">
            {error.kind === "unauthorized" ? <LogIn size={32} style={{ color: "var(--blue)" }} /> : <TriangleAlert size={32} style={{ color: "var(--danger)" }} />}
            <h2 className="h3">{error.kind === "unauthorized" ? "Masuk untuk melihat pesanan" : "Tidak dapat memuat pesanan"}</h2>
            <p className="muted small" style={{ maxWidth: 460 }}>{error.message}</p>
            {error.kind === "unauthorized" ? (
              <Link className="button button-primary button-sm" href="/login?redirect=%2Forders">
                <LogIn size={14} /> Masuk
              </Link>
            ) : (
              <button className="button button-primary button-sm" type="button" onClick={() => setReloadToken((value) => value + 1)}>
                <RefreshCw size={14} /> Coba lagi
              </button>
            )}
          </div>
        ) : orders.length === 0 ? (
          <div className="card orders-state">
            <PackageOpen size={32} style={{ color: "var(--muted)" }} />
            <h2 className="h3">Belum ada pesanan</h2>
            <p className="muted small" style={{ maxWidth: 460 }}>
              Pesanan yang Anda buat akan muncul di sini beserta status pembayaran dan detail aksesnya.
            </p>
            <Link className="button button-primary button-sm" href="/products">Lihat layanan</Link>
          </div>
        ) : (
          <>
            <div className="orders-summary">
              <p className="muted small" style={{ margin: 0 }}>
                Menampilkan {firstRow}–{lastRow} dari {total} pesanan
              </p>
            </div>

            {archiveNotice && <div className="notice success" role="status">{archiveNotice}</div>}
            {archiveError && !archiveRequest && (
              <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>
                {archiveError}
              </div>
            )}
            {copyError && (
              <div className="notice" role="alert" style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}>
                {copyError}
              </div>
            )}

            {archivableOrders.length > 0 && (
              <div className="orders-bulk-toolbar">
                <label className="orders-bulk-select">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllOnPage}
                    aria-checked={someSelected ? "mixed" : allSelected}
                  />
                  <span>Pilih semua</span>
                </label>
                <div className="orders-bulk-actions">
                  <span className="orders-bulk-count" aria-live="polite">
                    {selectedOrders.length > 0
                      ? `${selectedOrders.length} pesanan dipilih`
                      : "Pilih pesanan yang ingin dihapus"}
                  </span>
                  <button
                    className="button button-danger button-sm"
                    type="button"
                    onClick={() => {
                      setArchiveError(null);
                      setArchiveNotice("");
                      setArchiveRequest({ orders: selectedOrders });
                    }}
                    disabled={selectedOrders.length === 0 || archiving}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Hapus terpilih
                  </button>
                </div>
              </div>
            )}

            <ul className="orders-list">
              {orders.map((order) => (
                <li key={order.id}>
                  <article className={`card order-list-item${selectedIds.has(order.id) ? " is-selected" : ""}`}>
                    <div className="order-list-main">
                      <div className="order-list-title">
                        {canArchiveOrder(order) && (
                          <label className="order-list-select">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              aria-label={`Pilih pesanan ${order.number}`}
                            />
                          </label>
                        )}
                        <strong>{order.number}</strong>
                        <button
                          className="button button-secondary button-sm order-copy-button"
                          type="button"
                          onClick={() => void copyOrderNumber(order)}
                          aria-label={`Salin nomor pesanan ${order.number}`}
                        >
                          {copiedOrderId === order.id
                            ? <><Check size={13} aria-hidden="true" /> Tersalin</>
                            : <><ClipboardCopy size={13} aria-hidden="true" /> Salin</>}
                        </button>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="muted order-list-meta">
                        <CalendarDays size={13} aria-hidden="true" />
                        <span>Dibuat {formatDateTimeID(order.created_at)}</span>
                      </p>
                      <p className="order-list-items">{itemSummary(order)}</p>
                    </div>
                    <div className="order-list-side">
                      <span className="muted small">Total</span>
                      <strong className="order-list-total tabular">{formatIDR(order.total)}</strong>
                      <div className="order-list-actions">
                        <Link
                          className="button button-secondary button-sm"
                          href={`/orders/${encodeURIComponent(order.id)}`}
                          aria-label={`Lihat detail pesanan ${order.number}`}
                        >
                          Lihat detail <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                        {canArchiveOrder(order) && (
                          <button
                            className="order-archive-button"
                            type="button"
                            onClick={() => {
                              setArchiveError(null);
                              setArchiveRequest({ orders: [order] });
                            }}
                            aria-label={`Hapus pesanan ${order.number} dari riwayat`}
                            title="Hapus dari riwayat"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <nav className="orders-pagination" aria-label="Halaman riwayat pesanan">
                <button
                  className="button button-secondary button-sm"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => changePage(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <span className="muted small" aria-live="polite">Halaman {page} dari {totalPages}</span>
                <button
                  className="button button-secondary button-sm"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => changePage(Math.min(totalPages, page + 1))}
                >
                  Berikutnya <ChevronRight size={14} />
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {archiveRequest && (
        <Modal
          title={archiveCount === 1 ? "Hapus dari riwayat pesanan?" : `Hapus ${archiveCount} pesanan dari riwayat?`}
          description={
            archiveCount === 1
              ? `Pesanan ${archiveRequest.orders[0].number} akan dihapus dari daftar riwayat Anda.`
              : `${archiveCount} pesanan yang dipilih akan dihapus dari daftar riwayat Anda.`
          }
          size="sm"
          role="alertdialog"
          onClose={closeArchiveDialog}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={closeArchiveDialog} disabled={archiving}>
                Batal
              </button>
              <button className="button button-danger" type="button" onClick={() => void confirmArchive()} disabled={archiving}>
                <Trash2 size={14} aria-hidden="true" />{" "}
                {archiving
                  ? "Menghapus…"
                  : archiveCount === 1
                    ? "Ya, hapus dari riwayat"
                    : `Ya, hapus ${archiveCount} pesanan`}
              </button>
            </>
          }
        >
          <p className="muted small" style={{ margin: 0 }}>
            Tindakan ini hanya menghapus item dari tampilan riwayat Anda, bukan menghapus data transaksi secara permanen.
            {archiveCount > 1 ? " Pesanan yang gagal dihapus akan tetap tampil di daftar." : ""}
          </p>
          {archiveError && <p className="order-archive-error" role="alert">{archiveError}</p>}
        </Modal>
      )}
    </>
  );
}
