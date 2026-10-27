"use client";

import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Pencil,
  Plus,
  Power,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusBadge } from "@/components/status-badge";
import { inventoryAccounts as seedInventoryAccounts, services } from "@/data/seed";
import { ApiError, adminApi, apiErrorCode, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import type { ApiInventoryAccount, ApiInventorySlot } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "expired", label: "Kedaluwarsa" },
] as const;

type InventoryStatus = (typeof STATUS_OPTIONS)[number]["value"];

type PriceOption = {
  id: string;
  label: string;
  amount: number;
};

type ProductOption = {
  id: string;
  name: string;
  prices: PriceOption[];
};

type AccountRow = {
  id: string;
  productId: string;
  productName: string;
  label: string;
  status: string;
  expiresAt: string | null;
  sharingLimit: number;
  totalSlots: number;
  availableSlots: number;
  usedSlots: number;
  remainingSlots: number;
  sellable: boolean;
};

type AssignmentState = {
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  rows: ApiInventorySlot[];
  total: number;
  page: number;
};

type AccountDraft = {
  productId: string;
  label: string;
  credentials: string;
  status: InventoryStatus;
  expires: string;
  sharingLimit: string;
};

type AccountFormState = AccountDraft & {
  mode: "create" | "edit";
  accountId?: string;
};

type PendingAccountSave = {
  accountId: string;
  label: string;
  changes: Record<string, unknown>;
  summary: string;
};

type PendingStatusChange = {
  accountId: string;
  label: string;
  nextStatus: "active" | "inactive";
};

type PendingSlot = {
  accountId: string;
  accountLabel: string;
  priceId: string;
  priceLabel: string;
  quantity: number;
  remainingAfter: number;
};

const ACCOUNT_PAGE_SIZE = 100;

const DEMO_PRODUCTS: ProductOption[] = services.map((product) => ({
  id: product.id,
  name: product.name,
  prices: product.priceOptions.map((option) => ({
    id: option.id,
    label: option.label,
    amount: option.price,
  })),
}));

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value?: string | null) {
  if (!value) return "Tidak dibatasi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tidak dibatasi";
  return dateFormatter.format(date);
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toExpiresAt(value: string) {
  return `${value}T00:00:00Z`;
}

function statusLabel(value: string) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function statusTone(status: string) {
  return status === "active" ? "status-success" : status === "expired" ? "status-danger" : "status-warning";
}

function mapAccount(account: ApiInventoryAccount, productsById: Map<string, ProductOption>): AccountRow {
  const productName =
    account.product?.name ?? productsById.get(account.product_id)?.name ?? "Produk tidak dikenal";
  const sharingLimit = account.sharing_limit ?? 1;
  const totalSlots = account.total_slots ?? 0;
  const availableSlots = account.available_slots ?? 0;
  const usedSlots = account.used_slots ?? Math.max(totalSlots - availableSlots, 0);
  const remainingSlots =
    account.remaining_slots ?? Math.max(sharingLimit - totalSlots, 0);
  const expired =
    Boolean(account.expires_at) && new Date(account.expires_at as string).getTime() < Date.now();

  return {
    id: account.id,
    productId: account.product_id,
    productName,
    label: (account.label ?? "").trim() || "Akun inventaris",
    status: account.status,
    expiresAt: account.expires_at ?? null,
    sharingLimit,
    totalSlots,
    availableSlots,
    usedSlots,
    remainingSlots,
    sellable: account.sellable ?? (account.status === "active" && !expired),
  };
}

function buildDemoAccounts(): AccountRow[] {
  return seedInventoryAccounts.map((seed, index) => ({
    id: seed.id,
    productId: DEMO_PRODUCTS.find((product) => product.name === seed.product)?.id ?? `demo-product-${index}`,
    productName: seed.product,
    label: `Akun ${index + 1}`,
    status: seed.status === "Kedaluwarsa" ? "expired" : "active",
    expiresAt: null,
    sharingLimit: Math.max(seed.totalSlots, 1),
    totalSlots: seed.totalSlots,
    availableSlots: Math.max(seed.totalSlots - seed.usedSlots, 0),
    usedSlots: seed.usedSlots,
    remainingSlots: Math.max(Math.max(seed.totalSlots, 1) - seed.totalSlots, 0),
    sellable: seed.status !== "Kedaluwarsa",
  }));
}

function describeInventoryError(error: unknown, action: "load" | "save" | "slot") {
  if (error instanceof ApiError) {
    const code = apiErrorCode(error);
    switch (code) {
      case "sharing_limit_exceeded":
        return "Limit sharing tercapai: jumlah akses melebihi kapasitas akun. Kurangi jumlah akses atau naikkan limit akun.";
      case "inventory_account_unavailable":
        return "Akun inventaris tidak aktif atau sudah kedaluwarsa. Pilih akun lain atau aktifkan akun tersebut.";
      case "inventory_account_mismatch":
        return "Akun yang dipilih bukan milik produk paket ini.";
      case "account_required":
        return "Belum ada akun aktif yang berkapasitas untuk produk ini. Tambahkan akun inventaris terlebih dahulu.";
      case "invalid_input":
        return error.message || "Data inventaris tidak valid.";
      default:
        break;
    }

    switch (error.status) {
      case 400:
        return error.message || "Data inventaris tidak valid.";
      case 401:
        return "Sesi berakhir. Silakan masuk kembali lalu coba lagi.";
      case 403:
        return "Anda tidak diizinkan mengelola inventaris.";
      case 404:
        return action === "save"
          ? "Akun inventaris tidak ditemukan. Muat ulang daftar akun."
          : "Data inventaris tidak ditemukan.";
      case 409:
        return error.message || "Perubahan bertentangan dengan kapasitas akun saat ini.";
      case 422:
        return error.message || "Akun atau paket tidak dapat dipakai untuk permintaan ini.";
      default:
        return `Gagal memproses inventaris (HTTP ${error.status}): ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : "Gagal memproses inventaris.";
}

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductOption[]>(() => (DEMO_MODE ? DEMO_PRODUCTS : []));
  const [accounts, setAccounts] = useState<AccountRow[]>(() => (DEMO_MODE ? buildDemoAccounts() : []));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [accountForm, setAccountForm] = useState<AccountFormState | null>(null);
  const [formError, setFormError] = useState("");
  const [pendingSave, setPendingSave] = useState<PendingAccountSave | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatusChange | null>(null);

  const [slotForm, setSlotForm] = useState<{ accountId: string; priceId: string; quantity: string } | null>(null);
  const [slotError, setSlotError] = useState("");
  const [pendingSlot, setPendingSlot] = useState<PendingSlot | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, AssignmentState>>({});
  const [accountTotal, setAccountTotal] = useState(0);
  const [accountPage, setAccountPage] = useState(1);
  const [loadingMoreAccounts, setLoadingMoreAccounts] = useState(false);
  const [loadingAllAccounts, setLoadingAllAccounts] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, inventory] = await Promise.all([
        adminApi.listProducts({ page: 1, per_page: 100 }),
        adminApi.listInventoryAccounts({ page: 1, per_page: 100 }),
      ]);

      const apiProducts = (catalog.products ?? []) as Array<{
        id: string;
        name: string;
        prices?: Array<{
          id: string;
          amount: number;
          active?: boolean;
          duration_name?: string;
          duration_days?: number;
          duration?: { days?: number; name?: string };
        }>;
      }>;

      const mappedProducts: ProductOption[] = apiProducts.map((product) => ({
        id: product.id,
        name: product.name,
        prices: (product.prices ?? [])
          .filter((price) => price.active !== false)
          .map((price) => {
            const days = price.duration_days ?? price.duration?.days ?? 30;
            return {
              id: price.id,
              label: price.duration_name ?? price.duration?.name ?? `${days} hari`,
              amount: price.amount,
            };
          }),
      }));

      const productsById = new Map(mappedProducts.map((product) => [product.id, product]));
      const mappedAccounts = ((inventory.accounts ?? []) as unknown as ApiInventoryAccount[]).map((account) =>
        mapAccount(account, productsById),
      );
      setProducts(mappedProducts);
      setAccounts(mappedAccounts);
      setAccountTotal(typeof inventory.total === "number" ? inventory.total : mappedAccounts.length);
      setAccountPage(1);
    } catch (error) {
      setLoadError(describeInventoryError(error, "load"));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Muat ulang seluruh halaman yang sedang terlihat. Ini menjaga pengguna yang
   * sudah berada di halaman 2+ agar tidak kehilangan baris setelah mutasi.
   */
  const refreshAccounts = useCallback(async () => {
    if (DEMO_MODE) return;
    const pages = Math.max(accountPage, 1);
    const productsById = new Map(products.map((product) => [product.id, product]));
    try {
      const responses = await Promise.all(
        Array.from({ length: pages }, (_, index) =>
          adminApi.listInventoryAccounts({ page: index + 1, per_page: ACCOUNT_PAGE_SIZE }),
        ),
      );
      const merged = responses.flatMap((response) =>
        ((response.accounts ?? []) as unknown as ApiInventoryAccount[]).map((account) =>
          mapAccount(account, productsById),
        ),
      );
      const last = responses[responses.length - 1];
      setAccounts(merged);
      if (last && typeof last.total === "number") setAccountTotal(last.total);
    } catch (error) {
      setActionError(describeInventoryError(error, "load"));
    }
  }, [accountPage, products]);

  /**
   * Pencarian harus mencakup semua akun, bukan hanya halaman yang sudah dimuat.
   * Saat pengguna mengetik, muat sisa halaman sekali (dibatasi) lalu filter
   * seluruh baris di klien.
   */
  const searchAllAccounts = useCallback(async () => {
    if (DEMO_MODE || loadingAllAccounts || accounts.length >= accountTotal) return;
    setLoadingAllAccounts(true);
    setActionError("");
    const productsById = new Map(products.map((product) => [product.id, product]));
    try {
      let page = accountPage;
      let total = accountTotal;
      const extra: AccountRow[] = [];
      while (page * ACCOUNT_PAGE_SIZE < total && page < 50) {
        page += 1;
        const response = await adminApi.listInventoryAccounts({ page, per_page: ACCOUNT_PAGE_SIZE });
        if (typeof response.total === "number") total = response.total;
        extra.push(
          ...((response.accounts ?? []) as unknown as ApiInventoryAccount[]).map((account) =>
            mapAccount(account, productsById),
          ),
        );
      }
      setAccounts((current) => {
        const seen = new Set(current.map((account) => account.id));
        return [...current, ...extra.filter((account) => !seen.has(account.id))];
      });
      setAccountTotal(total);
      setAccountPage(page);
    } catch (error) {
      setActionError(describeInventoryError(error, "load"));
    } finally {
      setLoadingAllAccounts(false);
    }
  }, [accountPage, accountTotal, accounts.length, loadingAllAccounts, products]);

  const loadMoreAccounts = async () => {
    if (DEMO_MODE || loadingMoreAccounts || accounts.length >= accountTotal) return;
    setLoadingMoreAccounts(true);
    setActionError("");
    try {
      const nextPage = accountPage + 1;
      const inventory = await adminApi.listInventoryAccounts({ page: nextPage, per_page: ACCOUNT_PAGE_SIZE });
      const productsById = new Map(products.map((product) => [product.id, product]));
      const mapped = ((inventory.accounts ?? []) as unknown as ApiInventoryAccount[]).map((account) =>
        mapAccount(account, productsById),
      );
      setAccounts((current) => {
        const ids = new Set(current.map((account) => account.id));
        return [...current, ...mapped.filter((account) => !ids.has(account.id))];
      });
      setAccountTotal(typeof inventory.total === "number" ? inventory.total : accountTotal);
      setAccountPage(nextPage);
    } catch (error) {
      setActionError(describeInventoryError(error, "load"));
    } finally {
      setLoadingMoreAccounts(false);
    }
  };

  useEffect(() => {
    if (DEMO_MODE) return;

    let cancelled = false;

    async function start() {
      const user = await bootstrapAuth();
      if (cancelled) return;
      if (!user) {
        setLoadError("Sesi tidak valid. Silakan masuk kembali.");
        setLoading(false);
        return;
      }
      if (user.role !== "admin") {
        setLoadError("Akses ditolak: hanya admin yang dapat mengelola inventaris");
        setLoading(false);
        return;
      }
      await loadData();
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const visibleAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) =>
      `${account.productName} ${account.label} ${statusLabel(account.status)}`.toLowerCase().includes(needle),
    );
  }, [accounts, query]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const priceLabelById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      product.prices.forEach((price) => map.set(price.id, `${product.name} · ${price.label}`));
    });
    return map;
  }, [products]);

  const metrics = useMemo(() => {
    const available = accounts.reduce((sum, account) => sum + account.availableSlots, 0);
    const provisioned = accounts.reduce((sum, account) => sum + account.totalSlots, 0);
    const used = accounts.reduce((sum, account) => sum + account.usedSlots, 0);
    const productCount = new Set(accounts.map((account) => account.productId)).size;
    const attention = accounts.filter(
      (account) => !account.sellable || account.availableSlots === 0 || account.remainingSlots === 0,
    ).length;

    return { available, provisioned, used, productCount, attention };
  }, [accounts]);

  const selectedSlotAccount = useMemo(
    () => (slotForm ? accounts.find((account) => account.id === slotForm.accountId) ?? null : null),
    [accounts, slotForm],
  );
  const slotProduct = selectedSlotAccount ? productById.get(selectedSlotAccount.productId) ?? null : null;

  const openCreateForm = () => {
    setActionError("");
    setNotice("");
    setPendingSave(null);
    setPendingStatus(null);
    setFormError("");
    setAccountForm({
      mode: "create",
      productId: products[0]?.id ?? "",
      label: "",
      credentials: "",
      status: "active",
      expires: "",
      sharingLimit: "1",
    });
  };

  const openEditForm = (account: AccountRow) => {
    setActionError("");
    setNotice("");
    setPendingSave(null);
    setPendingStatus(null);
    setFormError("");
    setAccountForm({
      mode: "edit",
      accountId: account.id,
      productId: account.productId,
      label: account.label,
      // Credentials are write-only: never prefill this field from the API.
      credentials: "",
      status: (account.status as InventoryStatus) ?? "active",
      expires: toDateInput(account.expiresAt),
      sharingLimit: String(account.sharingLimit),
    });
  };

  const closeAccountForm = () => {
    setAccountForm(null);
    setPendingSave(null);
    setFormError("");
  };

  const openSlotForm = (account?: AccountRow) => {
    setActionError("");
    setNotice("");
    setSlotError("");
    setPendingSlot(null);
    setPendingSave(null);
    setPendingStatus(null);

    const fallback =
      account ??
      accounts.find((item) => item.sellable && item.remainingSlots > 0) ??
      accounts[0] ??
      null;
    if (!fallback) {
      setActionError("Belum ada akun inventaris. Tambahkan akun terlebih dahulu.");
      return;
    }

    const product = productById.get(fallback.productId);
    const priceId = product?.prices[0]?.id ?? "";
    const defaultQuantity = Math.max(1, Math.min(10, fallback.remainingSlots || 1));
    setSlotForm({ accountId: fallback.id, priceId, quantity: String(defaultQuantity) });
  };

  const closeSlotForm = () => {
    setSlotForm(null);
    setSlotError("");
    setPendingSlot(null);
  };

  const handleSlotAccountChange = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    const product = account ? productById.get(account.productId) : null;
    const defaultQuantity = Math.max(1, Math.min(10, account?.remainingSlots || 1));
    setSlotError("");
    setPendingSlot(null);
    setSlotForm({
      accountId,
      priceId: product?.prices[0]?.id ?? "",
      quantity: String(defaultQuantity),
    });
  };

  const submitAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountForm) return;

    setFormError("");
    setActionError("");

    const label = accountForm.label.trim();
    const sharingLimit = Number(accountForm.sharingLimit);
    if (!label) {
      setFormError("Label akun wajib diisi.");
      return;
    }
    if (!Number.isInteger(sharingLimit) || sharingLimit < 1 || sharingLimit > 1000) {
      setFormError("Limit sharing harus berupa angka antara 1 dan 1000.");
      return;
    }
    if (accountForm.mode === "create" && !accountForm.productId) {
      setFormError("Pilih produk untuk akun inventaris.");
      return;
    }
    if (accountForm.mode === "create" && !accountForm.credentials.trim()) {
      setFormError("Kredensial akun wajib diisi saat membuat akun.");
      return;
    }
    if (accountForm.credentials && !accountForm.credentials.trim()) {
      setFormError("Kredensial baru tidak boleh kosong. Kosongkan kolom bila tidak ingin mengganti.");
      return;
    }

    if (accountForm.mode === "create") {
      const payload: Record<string, unknown> = {
        product_id: accountForm.productId,
        label,
        credentials: accountForm.credentials.trim(),
        sharing_limit: sharingLimit,
      };
      if (accountForm.expires) payload.expires_at = toExpiresAt(accountForm.expires);

      setSubmitting(true);
      try {
        if (DEMO_MODE) {
          const product = productById.get(accountForm.productId);
          setAccounts((current) => [
            {
              id: `demo-account-${Date.now()}`,
              productId: accountForm.productId,
              productName: product?.name ?? "Produk demo",
              label,
              status: accountForm.status,
              expiresAt: accountForm.expires ? toExpiresAt(accountForm.expires) : null,
              sharingLimit,
              totalSlots: 0,
              availableSlots: 0,
              usedSlots: 0,
              remainingSlots: sharingLimit,
              sellable: accountForm.status === "active",
            },
            ...current,
          ]);
        } else {
          const created = await adminApi.createInventoryAccount(payload);
          // POST akun selalu membuat status `active`; kontrak tidak menerima
          // `status`, jadi pilihan nonaktif/kedaluwarsa diterapkan lewat PATCH.
          if (accountForm.status !== "active" && created?.id) {
            try {
              await adminApi.updateInventoryAccount(created.id, { status: accountForm.status });
            } catch (error) {
              closeAccountForm();
              await refreshAccounts();
              setActionError(
                `Akun "${label}" dibuat sebagai aktif, tetapi status ${statusLabel(accountForm.status)} gagal diterapkan: ${describeInventoryError(error, "save")}`,
              );
              return;
            }
          }
        }

        setNotice(`Akun "${label}" dibuat. Klik "Tambah akses" pada baris akun untuk menambahkan slot jual.`);
        closeAccountForm();
        if (!DEMO_MODE) await refreshAccounts();
      } catch (error) {
        setFormError(describeInventoryError(error, "save"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const account = accounts.find((item) => item.id === accountForm.accountId);
    if (!account) {
      setFormError("Akun inventaris tidak ditemukan. Muat ulang daftar akun.");
      return;
    }

    const changes: Record<string, unknown> = {};
    if (label !== account.label) changes.label = label;
    if (accountForm.status !== account.status) changes.status = accountForm.status;
    if (sharingLimit !== account.sharingLimit) changes.sharing_limit = sharingLimit;
    if (accountForm.expires && accountForm.expires !== toDateInput(account.expiresAt)) {
      changes.expires_at = toExpiresAt(accountForm.expires);
    }
    if (accountForm.credentials.trim()) changes.credentials = accountForm.credentials.trim();

    if (Object.keys(changes).length === 0) {
      setFormError("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setPendingSave({
      accountId: account.id,
      label: account.label,
      changes,
      summary: describeChanges(account, changes),
    });
  };

  const applyAccountUpdate = async () => {
    if (!pendingSave) return;
    setSubmitting(true);
    setActionError("");
    try {
      if (DEMO_MODE) {
        setAccounts((current) =>
          current.map((account) =>
            account.id === pendingSave.accountId
              ? {
                  ...account,
                  label: (pendingSave.changes.label as string) ?? account.label,
                  status: (pendingSave.changes.status as string) ?? account.status,
                  sharingLimit: (pendingSave.changes.sharing_limit as number) ?? account.sharingLimit,
                  expiresAt: (pendingSave.changes.expires_at as string) ?? account.expiresAt,
                }
              : account,
          ),
        );
      } else {
        await adminApi.updateInventoryAccount(pendingSave.accountId, pendingSave.changes);
      }

      const label = (pendingSave.changes.label as string) ?? pendingSave.label;
      setNotice(`Akun "${label}" diperbarui. Kredensial tidak pernah ditampilkan kembali.`);
      setPendingSave(null);
      closeAccountForm();
      if (!DEMO_MODE) await refreshAccounts();
    } catch (error) {
      setFormError(describeInventoryError(error, "save"));
      setPendingSave(null);
    } finally {
      setSubmitting(false);
    }
  };

  const applyStatusChange = async () => {
    if (!pendingStatus) return;
    setSubmitting(true);
    setActionError("");
    try {
      if (DEMO_MODE) {
        setAccounts((current) =>
          current.map((account) =>
            account.id === pendingStatus.accountId
              ? { ...account, status: pendingStatus.nextStatus, sellable: pendingStatus.nextStatus === "active" }
              : account,
          ),
        );
      } else {
        await adminApi.updateInventoryAccount(pendingStatus.accountId, { status: pendingStatus.nextStatus });
      }

      setNotice(
        `Akun "${pendingStatus.label}" ${pendingStatus.nextStatus === "active" ? "diaktifkan" : "dinonaktifkan"}.`,
      );
      setPendingStatus(null);
      if (!DEMO_MODE) await refreshAccounts();
    } catch (error) {
      setActionError(describeInventoryError(error, "save"));
      setPendingStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  const submitSlots = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotForm) return;

    setSlotError("");
    setActionError("");

    const account = selectedSlotAccount;
    if (!account) {
      setSlotError("Pilih akun inventaris terlebih dahulu.");
      return;
    }
    if (!slotForm.priceId) {
      setSlotError("Pilih paket durasi untuk akses ini.");
      return;
    }

    const quantity = Number(slotForm.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setSlotError("Jumlah akses harus berupa angka antara 1 dan 100.");
      return;
    }
    if (!account.sellable) {
      setSlotError("Akun ini nonaktif atau sudah kedaluwarsa. Aktifkan akun terlebih dahulu.");
      return;
    }
    if (quantity > account.remainingSlots) {
      setSlotError(
        `Jumlah melebihi kapasitas akun. Sisa kapasitas ${account.label}: ${account.remainingSlots} akses (limit ${account.sharingLimit}).`,
      );
      return;
    }

    const price = slotProduct?.prices.find((item) => item.id === slotForm.priceId);
    setPendingSlot({
      accountId: account.id,
      accountLabel: account.label,
      priceId: slotForm.priceId,
      priceLabel: price ? `${slotProduct?.name ?? account.productName} · ${price.label}` : slotForm.priceId,
      quantity,
      remainingAfter: Math.max(account.remainingSlots - quantity, 0),
    });
  };

  const applySlotCreation = async () => {
    if (!pendingSlot) return;
    const account = accounts.find((item) => item.id === pendingSlot.accountId);
    if (!account) {
      setSlotError("Akun inventaris tidak ditemukan. Muat ulang daftar akun.");
      setPendingSlot(null);
      return;
    }

    setSubmitting(true);
    setSlotError("");
    setActionError("");
    try {
      if (DEMO_MODE) {
        setAccounts((current) =>
          current.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  totalSlots: item.totalSlots + pendingSlot.quantity,
                  availableSlots: item.availableSlots + pendingSlot.quantity,
                  remainingSlots: Math.max(item.remainingSlots - pendingSlot.quantity, 0),
                }
              : item,
          ),
        );
        setNotice(`${pendingSlot.quantity} akses demo ditambahkan ke akun "${account.label}".`);
      } else {
        const result = await adminApi.createInventorySlots({
          product_price_id: pendingSlot.priceId,
          quantity: pendingSlot.quantity,
          inventory_account_id: pendingSlot.accountId,
        });
        setNotice(`${result.created} akses ditambahkan ke akun "${account.label}".`);
        await refreshAccounts();
        if (expandedId) await loadAssignments(expandedId, true);
      }

      closeSlotForm();
    } catch (error) {
      setSlotError(describeInventoryError(error, "slot"));
      setPendingSlot(null);
      if (!DEMO_MODE) await refreshAccounts();
    } finally {
      setSubmitting(false);
    }
  };

  const loadAssignments = useCallback(async (accountId: string, force = false) => {
    const current = assignments[accountId];
    if (!DEMO_MODE && current && !force && !current.error) return;

    setAssignments((state) => ({
      ...state,
      [accountId]: {
        loading: true,
        loadingMore: false,
        error: null,
        rows: force ? [] : current?.rows ?? [],
        total: force ? 0 : current?.total ?? 0,
        page: force ? 1 : current?.page ?? 1,
      },
    }));

    if (DEMO_MODE) {
      setAssignments((state) => ({
        ...state,
        [accountId]: { loading: false, loadingMore: false, error: null, rows: [], total: 0, page: 1 },
      }));
      return;
    }

    try {
      const response = await adminApi.listInventorySlots(accountId, { page: 1, per_page: 100 });
      setAssignments((state) => ({
        ...state,
        [accountId]: {
          loading: false,
          loadingMore: false,
          error: null,
          rows: response.slots ?? [],
          total: response.total ?? 0,
          page: response.page ?? 1,
        },
      }));
    } catch (error) {
      setAssignments((state) => ({
        ...state,
        [accountId]: {
          loading: false,
          loadingMore: false,
          error: describeInventoryError(error, "load"),
          rows: [],
          total: 0,
          page: 1,
        },
      }));
    }
  }, [assignments]);

  const loadMoreAssignments = async (accountId: string) => {
    const current = assignments[accountId];
    if (!current || current.loading || current.loadingMore || current.rows.length >= current.total) return;

    setAssignments((state) => ({
      ...state,
      [accountId]: { ...current, loadingMore: true, error: null },
    }));

    try {
      const response = await adminApi.listInventorySlots(accountId, {
        page: (current.page ?? 1) + 1,
        per_page: 100,
      });
      setAssignments((state) => {
        const previous = state[accountId];
        if (!previous) return state;
        const ids = new Set(previous.rows.map((slot) => slot.id));
        return {
          ...state,
          [accountId]: {
            ...previous,
            loadingMore: false,
            error: null,
            rows: [...previous.rows, ...(response.slots ?? []).filter((slot) => !ids.has(slot.id))],
            total: response.total ?? previous.total,
            page: response.page ?? (current.page ?? 1) + 1,
          },
        };
      });
    } catch (error) {
      setAssignments((state) => ({
        ...state,
        [accountId]: {
          ...current,
          loadingMore: false,
          error: describeInventoryError(error, "load"),
        },
      }));
    }
  };

  const toggleAssignments = async (accountId: string) => {
    if (expandedId === accountId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(accountId);
    await loadAssignments(accountId);
  };

  if (loadError && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 420 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat inventaris</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {loadError}
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
        title="Inventaris akun"
        description="Kelola akun langganan yang dijual, batas sharing, kapasitas akses, dan assignment pesanan."
        actions={
          <>
            <button className="button button-secondary button-sm" type="button" onClick={() => openSlotForm()} disabled={accounts.length === 0}>
              <Boxes size={13} /> Tambah akses
            </button>
            <button className="button button-primary button-sm" type="button" onClick={openCreateForm}>
              <Plus size={13} /> Tambah akun
            </button>
          </>
        }
      />

      <section className="metric-grid">
        <MetricCard
          label="Akun inventaris"
          value={DEMO_MODE ? String(accounts.length) : String(accountTotal)}
          change={
            DEMO_MODE
              ? `${metrics.productCount} produk memiliki akun`
              : `${accounts.length} termuat · ${metrics.productCount} produk (dari halaman termuat)`
          }
          icon={<Boxes size={14} />}
        />
        <MetricCard
          label="Akses tersedia"
          value={String(metrics.available)}
          change={`Dari ${metrics.provisioned} akses terprovisi`}
        />
        <MetricCard
          label="Akses terpakai"
          value={String(metrics.used)}
          change="Assignment pesanan aktif"
        />
        <MetricCard
          label="Perlu perhatian"
          value={String(metrics.attention)}
          change="Nonaktif, kedaluwarsa, atau kapasitas penuh"
          icon={<AlertTriangle size={14} />}
        />
      </section>

      {notice && <div className="notice success" role="status">{notice}</div>}
      {actionError && <div className="notice" role="alert" style={{ color: "var(--danger)" }}>{actionError}</div>}

      {pendingStatus && (
        <Modal
          title={`Konfirmasi: ${pendingStatus.nextStatus === "active" ? "aktifkan" : "nonaktifkan"} akun ${pendingStatus.label}?`}
          size="sm"
          role="alertdialog"
          onClose={() => setPendingStatus(null)}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={() => setPendingStatus(null)} disabled={submitting}>
                Batal
              </button>
              <button className="button button-primary" type="button" onClick={applyStatusChange} disabled={submitting}>
                {submitting ? "Menyimpan…" : pendingStatus.nextStatus === "active" ? "Ya, aktifkan" : "Ya, nonaktifkan"}
              </button>
            </>
          }
        >
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            {pendingStatus.nextStatus === "active"
              ? "Akun akan bisa dipakai kembali untuk akses baru."
              : "Slot yang sudah ada tetap terpakai, tetapi akun tidak akan dipilih untuk kapasitas baru."}
          </p>
        </Modal>
      )}

      {accountForm && (
        <Modal
          title={accountForm.mode === "create" ? "Tambah akun inventaris" : `Kelola akun — ${accountForm.label || "akun"}`}
          description="Kredensial disimpan terenkripsi dan tidak pernah ditampilkan kembali."
          size="lg"
          onClose={closeAccountForm}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={closeAccountForm} disabled={submitting}>
                Batal
              </button>
              <button className="button button-primary" type="submit" form="inventory-account-form" disabled={submitting}>
                {submitting ? "Menyimpan…" : accountForm.mode === "create" ? "Simpan akun" : "Simpan perubahan"}
              </button>
            </>
          }
        >
          <form id="inventory-account-form" onSubmit={submitAccount} aria-label="Form akun inventaris">
            <div className="form-grid">
              {accountForm.mode === "create" && (
                <div className="field">
                  <label className="label" htmlFor="inv-product">Produk</label>
                  <SearchableSelect
                    inputId="inv-product"
                    ariaLabel="Produk"
                    value={accountForm.productId}
                    onChange={(value) => setAccountForm({ ...accountForm, productId: value })}
                    placeholder="Pilih produk"
                    required
                    options={products.map((product) => ({ value: product.id, label: product.name }))}
                  />
                </div>
              )}
              <div className="field">
                <label className="label" htmlFor="inv-label">Label akun</label>
                <input
                  className="input"
                  id="inv-label"
                  value={accountForm.label}
                  onChange={(event) => setAccountForm({ ...accountForm, label: event.target.value })}
                  placeholder="Contoh: Akun utama"
                  maxLength={120}
                  required
                />
              </div>
              <div className={accountForm.mode === "create" ? "field" : "field field-full"}>
                <label className="label" htmlFor="inv-credentials">
                  {accountForm.mode === "create" ? "Kredensial akun" : "Kredensial baru (opsional)"}
                </label>
                <textarea
                  className="input"
                  id="inv-credentials"
                  name="credentials"
                  rows={3}
                  value={accountForm.credentials}
                  onChange={(event) => setAccountForm({ ...accountForm, credentials: event.target.value })}
                  placeholder={accountForm.mode === "create" ? "Email dan kata sandi akun" : "Kosongkan bila tidak ingin mengganti kredensial"}
                  autoComplete="off"
                />
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  Kredensial disimpan terenkripsi dan tidak pernah ditampilkan kembali setelah disimpan.
                </p>
              </div>
              <div className="field">
                <label className="label" htmlFor="inv-status">Status akun</label>
                <SearchableSelect
                  inputId="inv-status"
                  ariaLabel="Status akun"
                  value={accountForm.status}
                  onChange={(value) => setAccountForm({ ...accountForm, status: value as InventoryStatus })}
                  options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="inv-sharing-limit">Limit sharing</label>
                <input
                  className="input"
                  id="inv-sharing-limit"
                  type="number"
                  min="1"
                  max="1000"
                  value={accountForm.sharingLimit}
                  onChange={(event) => setAccountForm({ ...accountForm, sharingLimit: event.target.value })}
                  required
                />
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>1 sampai 1000 akses per akun.</p>
              </div>
              <div className="field">
                <label className="label" htmlFor="inv-expiry">Kedaluwarsa</label>
                <input
                  className="input"
                  id="inv-expiry"
                  type="date"
                  value={accountForm.expires}
                  onChange={(event) => setAccountForm({ ...accountForm, expires: event.target.value })}
                />
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  Opsional. Tanggal yang sudah tersimpan tidak dapat dihapus dari form ini.
                </p>
              </div>
              {formError && (
                <p className="field field-full" role="alert" style={{ color: "var(--danger)", fontSize: 11, margin: 0 }}>
                  {formError}
                </p>
              )}

              {pendingSave && (
                <div className="notice field-full" role="alertdialog" aria-label="Konfirmasi perubahan akun">
                  <p style={{ margin: "0 0 12px" }}>{pendingSave.summary}</p>
                  <div className="table-actions" style={{ justifyContent: "flex-start" }}>
                    <button className="button button-primary button-sm" type="button" onClick={applyAccountUpdate} disabled={submitting}>
                      {submitting ? "Menyimpan…" : "Ya, terapkan perubahan"}
                    </button>
                    <button className="button button-secondary button-sm" type="button" onClick={() => setPendingSave(null)} disabled={submitting}>
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {slotForm && (
        <Modal
          title="Tambah akses akun"
          description="Tambahkan kapasitas jual pada akun inventaris yang masih memiliki sisa slot."
          size="lg"
          onClose={closeSlotForm}
          footer={
            <>
              <button className="button button-secondary" type="button" onClick={closeSlotForm} disabled={submitting}>
                Batal
              </button>
              <button
                className="button button-primary"
                type="submit"
                form="inventory-slot-form"
                disabled={submitting || !selectedSlotAccount || selectedSlotAccount.remainingSlots === 0}
              >
                {submitting ? "Menyimpan…" : "Simpan akses"}
              </button>
            </>
          }
        >
          <form id="inventory-slot-form" onSubmit={submitSlots} aria-label="Form tambah akses">
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="inv-slot-account">Akun</label>
                <SearchableSelect
                  inputId="inv-slot-account"
                  ariaLabel="Akun"
                  value={slotForm.accountId}
                  onChange={handleSlotAccountChange}
                  required
                  options={accounts.map((account) => ({
                    value: account.id,
                    label: `${account.productName} · ${account.label} · sisa ${account.remainingSlots} slot`,
                  }))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="inv-slot-price">Paket</label>
                <SearchableSelect
                  inputId="inv-slot-price"
                  ariaLabel="Paket"
                  value={slotForm.priceId}
                  onChange={(value) => {
                    setSlotForm({ ...slotForm, priceId: value });
                    setPendingSlot(null);
                  }}
                  placeholder="Pilih paket"
                  required
                  options={(slotProduct?.prices ?? []).map((price) => ({ value: price.id, label: price.label }))}
                />
                {slotProduct && slotProduct.prices.length === 0 && (
                  <p className="muted" style={{ margin: 0, fontSize: 11 }}>Produk ini belum memiliki paket aktif.</p>
                )}
              </div>
              <div className="field">
                <label className="label" htmlFor="inv-slot-quantity">Jumlah akses</label>
                <input
                  className="input"
                  id="inv-slot-quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={slotForm.quantity}
                  onChange={(event) => {
                    setSlotForm({ ...slotForm, quantity: event.target.value });
                    setPendingSlot(null);
                  }}
                  required
                />
                {selectedSlotAccount && (
                  <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                    Sisa kapasitas {selectedSlotAccount.label}: {selectedSlotAccount.remainingSlots} slot
                    {" "}(limit {selectedSlotAccount.sharingLimit}, terprovisi {selectedSlotAccount.totalSlots}).
                  </p>
                )}
                {selectedSlotAccount && selectedSlotAccount.remainingSlots === 0 && (
                  <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 11 }}>
                    Limit sharing akun ini sudah tercapai. Naikkan limit atau pilih akun lain.
                  </p>
                )}
              </div>
              {slotError && (
                <p className="field field-full" role="alert" style={{ color: "var(--danger)", fontSize: 11, margin: 0 }}>
                  {slotError}
                </p>
              )}

              {pendingSlot && (
                <div className="notice field-full" role="alertdialog" aria-label="Konfirmasi tambah akses">
                  <p style={{ margin: "0 0 12px" }}>
                    Konfirmasi tambah akses: {pendingSlot.quantity} akses pada akun {`"${pendingSlot.accountLabel}"`} untuk paket{" "}
                    {pendingSlot.priceLabel}. Sisa kapasitas setelah ditambahkan: {pendingSlot.remainingAfter} akses.
                  </p>
                  <div className="table-actions" style={{ justifyContent: "flex-start" }}>
                    <button className="button button-primary button-sm" type="button" onClick={applySlotCreation} disabled={submitting}>
                      {submitting ? "Menyimpan…" : "Ya, tambahkan akses"}
                    </button>
                    <button className="button button-secondary button-sm" type="button" onClick={() => setPendingSlot(null)} disabled={submitting}>
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input
            className="input"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim().length >= 2) void searchAllAccounts();
            }}
            placeholder="Cari produk, label akun, atau status…"
            aria-label="Cari inventaris"
          />
        </div>
        {loadingAllAccounts && (
          <span className="muted" style={{ fontSize: 9 }} role="status">Mencari di semua akun…</span>
        )}
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>

      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <span className="muted" style={{ fontSize: 11 }}>
          Menampilkan {accounts.length} dari {accountTotal} akun
        </span>
        {accounts.length < accountTotal && (
          <button
            className="button button-secondary button-sm"
            type="button"
            onClick={loadMoreAccounts}
            disabled={loadingMoreAccounts}
          >
            {loadingMoreAccounts ? "Memuat…" : "Muat lebih banyak akun"}
          </button>
        )}
      </div>

      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Akun</th>
                <th>Status</th>
                <th>Kedaluwarsa</th>
                <th>Limit sharing</th>
                <th>Slot</th>
                <th>Assignment</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center" }}>Memuat akun inventaris…</td>
                </tr>
              ) : visibleAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center" }}>
                    {accounts.length === 0
                      ? "Belum ada akun inventaris. Tambahkan akun untuk mulai menjual akses."
                      : "Tidak ada akun yang cocok dengan pencarian."}
                  </td>
                </tr>
              ) : (
                visibleAccounts.map((account) => {
                  const assignment = assignments[account.id];
                  return (
                    <AccountRows
                      key={account.id}
                      account={account}
                      expanded={expandedId === account.id}
                      assignment={assignment}
                      priceLabelById={priceLabelById}
                      onToggleAssignments={() => toggleAssignments(account.id)}
                      onLoadMoreAssignments={() => loadMoreAssignments(account.id)}
                      onEdit={() => openEditForm(account)}
                      onAddSlot={() => openSlotForm(account)}
                      onToggleStatus={() =>
                        setPendingStatus({
                          accountId: account.id,
                          label: account.label,
                          nextStatus: account.status === "active" ? "inactive" : "active",
                        })
                      }
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AccountRows({
  account,
  expanded,
  assignment,
  priceLabelById,
  onToggleAssignments,
  onLoadMoreAssignments,
  onEdit,
  onAddSlot,
  onToggleStatus,
}: {
  account: AccountRow;
  expanded: boolean;
  assignment?: AssignmentState;
  priceLabelById: Map<string, string>;
  onToggleAssignments: () => void;
  onLoadMoreAssignments: () => void;
  onEdit: () => void;
  onAddSlot: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <>
      <tr>
        <td className="table-primary">{account.productName}</td>
        <td>{account.label}</td>
        <td>
          <span className={`badge badge-dot ${statusTone(account.status)}`}>{statusLabel(account.status)}</span>
        </td>
        <td>{formatDate(account.expiresAt)}</td>
        <td className="tabular">{account.sharingLimit}</td>
        <td>
          {account.totalSlots === 0 ? (
            <span className="muted">Belum ada akses</span>
          ) : (
            <>
              <span className="tabular">{account.usedSlots} / {account.totalSlots}</span>
              <span className="muted"> · {account.availableSlots} tersedia</span>
            </>
          )}
          <div
            className="inventory-bar"
            role="progressbar"
            aria-label={`${account.usedSlots} dari ${account.sharingLimit} akses terpakai`}
            aria-valuenow={account.usedSlots}
            aria-valuemin={0}
            aria-valuemax={account.sharingLimit}
            style={{ marginTop: 5 }}
          >
            <span style={{ width: `${Math.min(account.sharingLimit > 0 ? (account.usedSlots / account.sharingLimit) * 100 : 0, 100)}%` }} />
          </div>
        </td>
        <td>
          <button
            className="button button-secondary button-sm"
            type="button"
            onClick={onToggleAssignments}
            aria-expanded={expanded}
            aria-label={`Lihat assignment ${account.label}`}
          >
            <ClipboardList size={12} /> {account.usedSlots} terpakai
          </button>
        </td>
        <td>
          <div className="table-actions">
            <button
              className="table-action"
              type="button"
              onClick={onEdit}
              title="Kelola akun"
              aria-label={`Kelola akun ${account.label}`}
            >
              <Pencil size={13} />
            </button>
            <button
              className={account.totalSlots === 0 ? "button button-secondary button-sm" : "table-action"}
              type="button"
              onClick={onAddSlot}
              title="Tambah akses"
              aria-label={`Tambah akses ke ${account.label}`}
            >
              <Plus size={13} />{account.totalSlots === 0 ? " Tambah akses" : null}
            </button>
            <button
              className="table-action"
              type="button"
              onClick={onToggleStatus}
              title={account.status === "active" ? "Nonaktifkan akun" : "Aktifkan akun"}
              aria-label={`${account.status === "active" ? "Nonaktifkan" : "Aktifkan"} akun ${account.label}`}
            >
              <Power size={13} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} style={{ height: "auto", padding: 0, whiteSpace: "normal", background: "var(--surface-2)" }}>
            <div style={{ padding: "14px 18px" }}>
              <div className="panel-header" style={{ marginBottom: 10 }}>
                <h3 className="panel-title">Assignment akses — {account.label}</h3>
                <span className="muted" style={{ fontSize: 10 }}>Hanya baca. Kredensial tidak ditampilkan.</span>
              </div>
              {assignment?.loading ? (
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>Memuat assignment…</p>
              ) : !assignment || assignment.rows.length === 0 ? (
                assignment?.error ? (
                  <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 11 }}>{assignment.error}</p>
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 11 }}>Belum ada akses atau assignment untuk akun ini.</p>
                )
              ) : (
                <>
                  <p className="muted" style={{ margin: "0 0 8px", fontSize: 11 }}>
                    Menampilkan {assignment.rows.length} dari {assignment.total} akses.
                  </p>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Paket</th>
                          <th>Status</th>
                          <th>Order</th>
                          <th>Pengguna</th>
                          <th>Reservasi</th>
                          <th>Dibuat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignment.rows.map((slot) => (
                          <tr key={slot.id}>
                            <td>{priceLabelById.get(slot.product_price_id) ?? slot.product_price_id}</td>
                            <td><StatusBadge status={slot.status} /></td>
                            <td>
                              {slot.order_id && slot.order_number ? (
                                <a href={`/dashboard/orders/${slot.order_id}`}>{slot.order_number}</a>
                              ) : slot.order_number ?? "—"}
                            </td>
                            <td>{slot.reserved_name ?? slot.reserved_email ?? "—"}</td>
                            <td>{formatDate(slot.reserved_until)}</td>
                            <td>{formatDate(slot.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {assignment.error && (
                    <p role="alert" style={{ margin: "8px 0 0", color: "var(--danger)", fontSize: 11 }}>{assignment.error}</p>
                  )}
                  {assignment.rows.length < assignment.total && (
                    <div className="table-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
                      <button
                        className="button button-secondary button-sm"
                        type="button"
                        onClick={onLoadMoreAssignments}
                        disabled={assignment.loadingMore}
                      >
                        {assignment.loadingMore ? "Memuat…" : "Muat assignment berikutnya"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function describeChanges(account: AccountRow, changes: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof changes.label === "string") parts.push(`label "${account.label}" → "${changes.label}"`);
  if (typeof changes.status === "string") parts.push(`status ${statusLabel(account.status)} → ${statusLabel(changes.status)}`);
  if (typeof changes.sharing_limit === "number") parts.push(`limit sharing ${account.sharingLimit} → ${changes.sharing_limit}`);
  if (typeof changes.expires_at === "string") parts.push(`kedaluwarsa ${formatDate(account.expiresAt)} → ${formatDate(changes.expires_at)}`);
  if (typeof changes.credentials === "string") parts.push("kredensial diganti");

  return `Konfirmasi perubahan akun ${account.label}: ${parts.join(", ")}.`;
}
