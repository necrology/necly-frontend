"use client";

import {
  AlertTriangle,
  ClipboardList,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { services } from "@/data/seed";
import { ApiError, adminApi, apiErrorCode, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import type { ApiInventoryAccount, ApiInventoryOTP, ApiProduct } from "@/lib/api";
import {
  mapApiInventoryAccountToManaged,
  mapApiInventorySlotAssignment,
  type ManagedAccount,
  type ManagedSlot,
} from "@/lib/admin-mappers";

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "expired", label: "Kedaluwarsa" },
] as const;

type AccountStatus = (typeof STATUS_OPTIONS)[number]["value"];

type AccountFormState = {
  mode: "create" | "edit";
  accountId?: string;
  productId: string;
  label: string;
  // Write-only: never prefilled from the API.
  credentials: string;
  status: AccountStatus;
  expires: string;
  sharingLimit: string;
  otpSecret: string;
  clearOtp: boolean;
};

type DetailState = {
  loading: boolean;
  error: string | null;
  account: ManagedAccount | null;
  slots: ManagedSlot[];
};

type DeleteTarget = {
  account: ManagedAccount;
  error: string | null;
};

type OtpState = {
  accountId: string;
  label: string;
  loading: boolean;
  error: string | null;
  code: string | null;
  remaining: number;
  period: number;
};

type SlotFormState = {
  accountId: string;
  label: string;
  priceId: string;
  quantity: string;
  error: string;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value?: string | null) {
  if (!value) return "Tanpa batas";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanpa batas";
  return dateFormatter.format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
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

function daysLabel(days: number | null) {
  if (days === null) return "Tanpa batas";
  if (days <= 0) return "Kedaluwarsa";
  return `${days} hari lagi`;
}

function paymentLabel(value?: string | null) {
  if (!value) return "—";
  return value;
}

function describeAccountError(error: unknown, action: "load" | "save" | "delete" | "otp" | "slot") {
  if (error instanceof ApiError) {
    const code = apiErrorCode(error);
    switch (code) {
      case "otp_not_configured":
        return "Secret OTP belum diatur untuk akun ini. Tambahkan secret TOTP lewat menu edit akun.";
      case "rate_limited":
        return "Terlalu banyak permintaan OTP. Tunggu sekitar satu menit lalu coba lagi.";
      case "needs_review":
        return "Akun ini masih di atas batas lima pengguna. Turunkan limit sharing ke 5 atau kurang sebelum menambah slot.";
      case "sharing_limit_exceeded":
        return "Kapasitas akun tidak mencukupi. Kurangi jumlah slot atau naikkan limit sharing (maksimal 5).";
      case "inventory_account_in_use":
        return "Akun tidak dapat dihapus karena masih memiliki slot yang terpakai, dipesan, atau tertaut pesanan.";
      case "inventory_account_unavailable":
        return "Akun tidak aktif atau sudah kedaluwarsa. Pilih akun lain atau perbarui masa aktifnya.";
      case "inventory_account_mismatch":
        return "Akun yang dipilih bukan milik produk paket ini.";
      case "invalid_input":
        return error.message || "Data akun tidak valid.";
      default:
        break;
    }

    switch (error.status) {
      case 400:
        return error.message || "Data akun tidak valid. Periksa limit sharing 1–5 dan format secret OTP.";
      case 401:
        return "Sesi berakhir. Silakan masuk kembali lalu coba lagi.";
      case 403:
        return "Anda tidak diizinkan mengelola akun.";
      case 404:
        return action === "load"
          ? "Akun tidak ditemukan. Muat ulang daftar akun."
          : "Data akun tidak ditemukan. Muat ulang daftar akun.";
      case 409:
        return action === "delete"
          ? "Akun tidak dapat dihapus karena masih dipakai. Lepaskan semua slot terlebih dahulu."
          : error.message || "Perubahan bertentangan dengan kapasitas atau status akun saat ini.";
      case 429:
        return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
      default:
        return `Gagal memproses akun (HTTP ${error.status}): ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : "Gagal memproses akun.";
}

type ProductOption = {
  id: string;
  name: string;
  prices: Array<{ id: string; label: string }>;
};

function mapProduct(product: ApiProduct): ProductOption {
  return {
    id: product.id,
    name: product.name,
    prices: (product.prices ?? [])
      .filter((price) => price.active !== false)
      .map((price) => {
        const days = price.duration_days ?? price.duration?.days ?? 30;
        return {
          id: price.id,
          label: price.duration_name ?? price.duration?.name ?? `${days} hari`,
        };
      }),
  };
}

const DEMO_PRODUCTS: ProductOption[] = services.map((product) => ({
  id: product.id,
  name: product.name,
  prices: product.priceOptions.map((option) => ({ id: option.id, label: option.label })),
}));

function buildDemoAccounts(): ManagedAccount[] {
  const now = Date.now();
  return DEMO_PRODUCTS.slice(0, 5).map((product, index) => {
    const sharingLimit = index === 4 ? 6 : Math.min(5, 2 + index);
    const totalSlots = Math.min(sharingLimit, index + 1);
    const usedSlots = index === 0 ? 0 : Math.min(totalSlots, index);
    const expiresAt = new Date(now + (index + 1) * 20 * 86_400_000).toISOString();
    return {
      id: `demo-account-${index + 1}`,
      productId: product.id,
      productName: product.name,
      label: `Akun ${index + 1}`,
      status: index === 4 ? "inactive" : "active",
      expiresAt,
      daysRemaining: (index + 1) * 20,
      sharingLimit,
      totalSlots,
      availableSlots: totalSlots - usedSlots,
      usedSlots,
      remainingSlots: Math.max(sharingLimit - totalSlots, 0),
      assignedUsers: usedSlots,
      otpConfigured: index % 2 === 0,
      needsReview: sharingLimit > 5,
      sellable: index !== 4,
    };
  });
}

function buildDemoSlots(account: ManagedAccount): ManagedSlot[] {
  const now = Date.now();
  return Array.from({ length: Math.max(account.usedSlots, 1) }, (_, index) => {
    const activatedAt = new Date(now - (index + 2) * 86_400_000).toISOString();
    return {
      id: `demo-slot-${account.id}-${index + 1}`,
      productPriceId: DEMO_PRODUCTS.find((product) => product.id === account.productId)?.prices[0]?.id ?? "demo-price",
      status: index === 0 ? "used" : "reserved",
      name: `Pelanggan ${index + 1}`,
      email: `pelanggan${index + 1}@example.test`,
      orderId: `demo-order-${index + 1}`,
      orderNumber: `ORD-DEMO-00${index + 1}`,
      reservedBy: `demo-user-${index + 1}`,
      paymentStatus: "paid",
      activatedAt,
      accessExpiresAt: new Date(now + (index + 5) * 86_400_000).toISOString(),
      daysRemaining: index + 5,
      reservedUntil: null,
      createdAt: activatedAt,
      updatedAt: activatedAt,
    };
  });
}

function historyFor(account: ManagedAccount, slots: ManagedSlot[]) {
  const rows: Array<{ key: string; at: string; title: string; detail: string }> = [];
  slots.forEach((slot) => {
    const owner = slot.name ?? slot.email ?? slot.orderNumber ?? slot.id;
    if (slot.createdAt) {
      rows.push({
        key: `${slot.id}-created`,
        at: slot.createdAt,
        title: "Slot dibuat",
        detail: `${owner} · ${slot.status}`,
      });
    }
    if (slot.activatedAt) {
      rows.push({
        key: `${slot.id}-activated`,
        at: slot.activatedAt,
        title: "Akses diaktifkan",
        detail: `${owner}${slot.orderNumber ? ` · ${slot.orderNumber}` : ""}`,
      });
    }
    if (slot.accessExpiresAt) {
      rows.push({
        key: `${slot.id}-expires`,
        at: slot.accessExpiresAt,
        title: "Masa akses berakhir",
        detail: `${owner} · ${daysLabel(slot.daysRemaining)}`,
      });
    }
    if (slot.updatedAt && slot.updatedAt !== slot.createdAt) {
      rows.push({
        key: `${slot.id}-updated`,
        at: slot.updatedAt,
        title: "Slot diperbarui",
        detail: `${owner} · ${slot.status}`,
      });
    }
  });
  return rows
    .filter((row) => {
      const time = new Date(row.at).getTime();
      return Number.isFinite(time);
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 20);
}

export default function AccountsPage() {
  const [products, setProducts] = useState<ProductOption[]>(() => (DEMO_MODE ? DEMO_PRODUCTS : []));
  const [accounts, setAccounts] = useState<ManagedAccount[]>(() => (DEMO_MODE ? buildDemoAccounts() : []));
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ loading: false, error: null, account: null, slots: [] });

  const [form, setForm] = useState<AccountFormState | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [otp, setOtp] = useState<OtpState | null>(null);
  const [slotForm, setSlotForm] = useState<SlotFormState | null>(null);

  const loadAccounts = useCallback(async () => {
    const [catalog, inventory] = await Promise.all([
      adminApi.listProducts({ page: 1, per_page: 100 }),
      adminApi.listInventoryAccounts({ page: 1, per_page: 100 }),
    ]);
    const mappedProducts = ((catalog.products ?? []) as ApiProduct[]).map(mapProduct);
    const productsById = new Map(mappedProducts.map((product) => [product.id, product]));
    const mappedAccounts = ((inventory.accounts ?? []) as ApiInventoryAccount[]).map((account) =>
      mapApiInventoryAccountToManaged(account, productsById.get(account.product_id)?.name),
    );
    setProducts(mappedProducts);
    setAccounts(mappedAccounts);
    return mappedAccounts;
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (DEMO_MODE) return;
    try {
      await loadAccounts();
    } catch (error) {
      setActionError(describeAccountError(error, "load"));
    }
  }, [loadAccounts]);

  useEffect(() => {
    if (DEMO_MODE) return;

    let cancelled = false;

    async function start() {
      try {
        const user = await bootstrapAuth();
        if (cancelled) return;
        if (!user) {
          setLoadError("Sesi tidak valid. Silakan masuk kembali.");
          return;
        }
        if (user.role !== "admin") {
          setLoadError("Akses ditolak: hanya admin yang dapat mengelola akun.");
          return;
        }
        await loadAccounts();
      } catch (error) {
        if (!cancelled) setLoadError(describeAccountError(error, "load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [loadAccounts]);

  useEffect(() => {
    if (!otp || otp.loading || !otp.code || otp.remaining <= 0) return;
    const timer = window.setInterval(() => {
      setOtp((current) => {
        if (!current || current.remaining <= 0) return current;
        return { ...current, remaining: Math.max(current.remaining - 1, 0) };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otp]);

  const loadDetail = useCallback(async (accountId: string, keepVisible = false) => {
    if (!keepVisible) {
      setDetail({ loading: true, error: null, account: null, slots: [] });
    }
    try {
      if (DEMO_MODE) {
        const account = accounts.find((item) => item.id === accountId) ?? null;
        setDetail({
          loading: false,
          error: account ? null : "Akun tidak ditemukan.",
          account,
          slots: account ? buildDemoSlots(account) : [],
        });
        return;
      }
      const [apiAccount, slotResponse] = await Promise.all([
        adminApi.getInventoryAccount(accountId),
        adminApi.listInventorySlots(accountId, { page: 1, per_page: 100 }),
      ]);
      setDetail({
        loading: false,
        error: null,
        account: mapApiInventoryAccountToManaged(apiAccount),
        slots: ((slotResponse.slots ?? []) as Parameters<typeof mapApiInventorySlotAssignment>[0][]).map(
          (slot) => mapApiInventorySlotAssignment(slot),
        ),
      });
    } catch (error) {
      setDetail((current) => ({
        loading: false,
        error: describeAccountError(error, "load"),
        account: keepVisible ? current.account : null,
        slots: keepVisible ? current.slots : [],
      }));
    }
  }, [accounts]);

  const openDetail = (account: ManagedAccount) => {
    if (detailId === account.id) {
      setDetailId(null);
      setDetail({ loading: false, error: null, account: null, slots: [] });
      return;
    }
    setDetailId(account.id);
    setSlotForm(null);
    void loadDetail(account.id);
  };

  const visibleAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((account) => {
      if (statusFilter !== "all" && account.status !== statusFilter) return false;
      if (productFilter !== "all" && account.productId !== productFilter) return false;
      if (!needle) return true;
      return `${account.productName} ${account.label} ${statusLabel(account.status)}`.toLowerCase().includes(needle);
    });
  }, [accounts, productFilter, query, statusFilter]);

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => map.set(product.id, product.name));
    accounts.forEach((account) => {
      if (!map.has(account.productId)) map.set(account.productId, account.productName);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [accounts, products]);

  const metrics = useMemo(() => {
    const linkedUsers = accounts.reduce((sum, account) => sum + account.assignedUsers, 0);
    const otpReady = accounts.filter((account) => account.otpConfigured).length;
    const needsReview = accounts.filter((account) => account.needsReview).length;
    const expiring = accounts.filter(
      (account) => account.daysRemaining !== null && account.daysRemaining > 0 && account.daysRemaining <= 7,
    ).length;
    return { linkedUsers, otpReady, needsReview, expiring };
  }, [accounts]);

  const openCreateForm = () => {
    setActionError("");
    setNotice("");
    setFormError("");
    setForm({
      mode: "create",
      productId: products[0]?.id ?? "",
      label: "",
      credentials: "",
      status: "active",
      expires: "",
      sharingLimit: "1",
      otpSecret: "",
      clearOtp: false,
    });
  };

  const openEditForm = (account: ManagedAccount) => {
    setActionError("");
    setNotice("");
    setFormError("");
    setForm({
      mode: "edit",
      accountId: account.id,
      productId: account.productId,
      label: account.label,
      // Write-only: leave empty so credentials are never exposed in the UI.
      credentials: "",
      status: (account.status as AccountStatus) ?? "active",
      expires: toDateInput(account.expiresAt),
      sharingLimit: String(account.sharingLimit),
      otpSecret: "",
      clearOtp: false,
    });
  };

  const closeForm = () => {
    setForm(null);
    setFormError("");
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    setFormError("");
    setActionError("");

    const label = form.label.trim();
    const sharingLimit = Number(form.sharingLimit);

    if (!label) {
      setFormError("Label akun wajib diisi.");
      return;
    }
    if (!Number.isInteger(sharingLimit) || sharingLimit < 1 || sharingLimit > 5) {
      setFormError("Limit sharing harus berupa angka bulat antara 1 dan 5.");
      return;
    }
    if (form.mode === "create" && !form.productId) {
      setFormError("Pilih produk untuk akun ini.");
      return;
    }
    if (form.mode === "create" && !form.credentials.trim()) {
      setFormError("Kredensial akun wajib diisi saat membuat akun.");
      return;
    }

    setSubmitting(true);
    try {
      if (form.mode === "create") {
        const payload: Record<string, unknown> = {
          product_id: form.productId,
          label,
          credentials: form.credentials.trim(),
          sharing_limit: sharingLimit,
        };
        if (form.expires) payload.expires_at = toExpiresAt(form.expires);
        if (form.otpSecret.trim()) payload.otp_secret = form.otpSecret.trim();

        if (DEMO_MODE) {
          const product = products.find((item) => item.id === form.productId);
          setAccounts((current) => [
            {
              id: `demo-account-${Date.now()}`,
              productId: form.productId,
              productName: product?.name ?? "Produk demo",
              label,
              status: "active",
              expiresAt: form.expires ? toExpiresAt(form.expires) : null,
              daysRemaining: null,
              sharingLimit,
              totalSlots: 0,
              availableSlots: 0,
              usedSlots: 0,
              remainingSlots: sharingLimit,
              assignedUsers: 0,
              otpConfigured: Boolean(form.otpSecret.trim()),
              needsReview: false,
              sellable: true,
            },
            ...current,
          ]);
        } else {
          const created = await adminApi.createInventoryAccount(payload);
          // POST selalu membuat akun aktif; kontrak tidak menerima `status`.
          if (form.status !== "active" && created?.id) {
            try {
              await adminApi.updateInventoryAccount(created.id, { status: form.status });
            } catch (error) {
              closeForm();
              await refreshAccounts();
              setActionError(
                `Akun "${label}" dibuat sebagai aktif, tetapi status ${statusLabel(form.status)} gagal diterapkan: ${describeAccountError(error, "save")}`,
              );
              return;
            }
          }
        }

        setNotice(`Akun "${label}" dibuat. Kredensial dan secret OTP disimpan terenkripsi dan tidak ditampilkan kembali.`);
        closeForm();
        await refreshAccounts();
        return;
      }

      const account = accounts.find((item) => item.id === form.accountId);
      if (!account) {
        setFormError("Akun tidak ditemukan. Muat ulang daftar akun.");
        return;
      }

      const changes: Record<string, unknown> = {};
      if (label !== account.label) changes.label = label;
      if (form.status !== account.status) changes.status = form.status;
      if (sharingLimit !== account.sharingLimit) changes.sharing_limit = sharingLimit;
      if (form.expires && form.expires !== toDateInput(account.expiresAt)) {
        changes.expires_at = toExpiresAt(form.expires);
      }
      if (form.credentials.trim()) changes.credentials = form.credentials.trim();
      if (form.clearOtp) {
        changes.otp_secret = "";
      } else if (form.otpSecret.trim()) {
        changes.otp_secret = form.otpSecret.trim();
      }

      if (Object.keys(changes).length === 0) {
        setFormError("Tidak ada perubahan untuk disimpan.");
        return;
      }

      if (DEMO_MODE) {
        setAccounts((current) =>
          current.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  label: (changes.label as string) ?? item.label,
                  status: (changes.status as string) ?? item.status,
                  sharingLimit: (changes.sharing_limit as number) ?? item.sharingLimit,
                  expiresAt: (changes.expires_at as string) ?? item.expiresAt,
                  otpConfigured:
                    changes.otp_secret === ""
                      ? false
                      : Boolean(changes.otp_secret) || item.otpConfigured,
                }
              : item,
          ),
        );
      } else {
        await adminApi.updateInventoryAccount(account.id, changes);
      }

      setNotice(`Akun "${label}" diperbarui. Kredensial dan secret OTP tidak pernah ditampilkan kembali.`);
      closeForm();
      await refreshAccounts();
      if (detailId === account.id) await loadDetail(account.id, true);
    } catch (error) {
      setFormError(describeAccountError(error, "save"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setDeleteTarget({ ...deleteTarget, error: null });
    try {
      if (DEMO_MODE) {
        setAccounts((current) => current.filter((item) => item.id !== deleteTarget.account.id));
      } else {
        await adminApi.deleteInventoryAccount(deleteTarget.account.id);
      }
      setNotice(`Akun "${deleteTarget.account.label}" dihapus.`);
      if (detailId === deleteTarget.account.id) {
        setDetailId(null);
        setDetail({ loading: false, error: null, account: null, slots: [] });
      }
      setDeleteTarget(null);
      await refreshAccounts();
    } catch (error) {
      setDeleteTarget({ ...deleteTarget, error: describeAccountError(error, "delete") });
    } finally {
      setSubmitting(false);
    }
  };

  const requestOtp = async (account: ManagedAccount) => {
    setActionError("");
    setOtp({
      accountId: account.id,
      label: account.label,
      loading: true,
      error: null,
      code: null,
      remaining: 0,
      period: 30,
    });
    try {
      let result: ApiInventoryOTP;
      if (DEMO_MODE) {
        result = { code: "123456", expires_in: 30, period: 30 };
        await Promise.resolve();
      } else {
        result = await adminApi.generateInventoryOTP(account.id);
      }
      setOtp((current) =>
        current && current.accountId === account.id
          ? {
              ...current,
              loading: false,
              error: null,
              code: result.code,
              remaining: Math.max(result.expires_in ?? result.period ?? 30, 0),
              period: result.period ?? 30,
            }
          : current,
      );
    } catch (error) {
      setOtp((current) =>
        current && current.accountId === account.id
          ? { ...current, loading: false, code: null, error: describeAccountError(error, "otp") }
          : current,
      );
    }
  };

  const openSlotForm = (account: ManagedAccount) => {
    setActionError("");
    setNotice("");
    const product = products.find((item) => item.id === account.productId);
    setSlotForm({
      accountId: account.id,
      label: account.label,
      priceId: product?.prices[0]?.id ?? "",
      quantity: "1",
      error: "",
    });
  };

  const submitSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotForm) return;

    const account = accounts.find((item) => item.id === slotForm.accountId);
    if (!account) {
      setSlotForm({ ...slotForm, error: "Akun tidak ditemukan. Muat ulang daftar akun." });
      return;
    }
    if (account.needsReview) {
      setSlotForm({ ...slotForm, error: "Akun perlu review. Turunkan limit sharing ke 5 atau kurang." });
      return;
    }
    if (!slotForm.priceId) {
      setSlotForm({ ...slotForm, error: "Pilih paket untuk slot ini." });
      return;
    }

    const quantity = Number(slotForm.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setSlotForm({ ...slotForm, error: "Jumlah slot harus berupa angka bulat minimal 1." });
      return;
    }
    if (quantity > account.remainingSlots) {
      setSlotForm({
        ...slotForm,
        error: `Jumlah melebihi sisa kapasitas akun (${account.remainingSlots} slot).`,
      });
      return;
    }

    setSubmitting(true);
    setSlotForm({ ...slotForm, error: "" });
    try {
      if (DEMO_MODE) {
        setAccounts((current) =>
          current.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  totalSlots: item.totalSlots + quantity,
                  availableSlots: item.availableSlots + quantity,
                  remainingSlots: Math.max(item.remainingSlots - quantity, 0),
                }
              : item,
          ),
        );
      } else {
        await adminApi.createInventorySlots({
          product_price_id: slotForm.priceId,
          quantity,
          inventory_account_id: account.id,
        });
      }
      setNotice(`${quantity} slot ditambahkan ke akun "${account.label}".`);
      setSlotForm(null);
      await refreshAccounts();
      if (detailId === account.id) await loadDetail(account.id, true);
    } catch (error) {
      setSlotForm({ ...slotForm, error: describeAccountError(error, "slot") });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 420 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat akun</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {loadError}
          </p>
          <button
            className="button button-primary button-sm"
            type="button"
            onClick={() => window.location.reload()}
            style={{ minWidth: 160 }}
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const detailAccount = detail.account;
  const detailProduct = detailAccount ? products.find((product) => product.id === detailAccount.productId) : null;
  const slotAccount = slotForm ? accounts.find((account) => account.id === slotForm.accountId) : null;
  const users = detail.slots.filter((slot) => slot.name || slot.email || slot.orderNumber);
  const history = detailAccount ? historyFor(detailAccount, detail.slots) : [];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Manajemen akun"
        description="Lihat akun yang dijual, pengguna yang tertaut, sisa masa aktif, kapasitas sharing, dan kode OTP."
        actions={
          <button className="button button-primary button-sm" type="button" onClick={openCreateForm}>
            <Plus size={13} /> Tambah akun
          </button>
        }
      />

      <section className="metric-grid">
        <MetricCard
          label="Akun terdaftar"
          value={DEMO_MODE ? String(accounts.length) : String(accounts.length)}
          change={`${accounts.filter((account) => account.status === "active").length} aktif`}
          icon={<UserRound size={14} />}
        />
        <MetricCard
          label="Pengguna tertaut"
          value={String(metrics.linkedUsers)}
          change="User unik dengan slot akun"
        />
        <MetricCard
          label="OTP siap"
          value={String(metrics.otpReady)}
          change={`${accounts.length - metrics.otpReady} akun belum dikonfigurasi`}
          icon={<KeyRound size={14} />}
        />
        <MetricCard
          label="Perlu perhatian"
          value={String(metrics.needsReview + metrics.expiring)}
          change={`${metrics.needsReview} perlu review · ${metrics.expiring} segera berakhir`}
          icon={<AlertTriangle size={14} />}
        />
      </section>

      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="notice" role="alert" style={{ color: "var(--danger)" }}>
          {actionError}
        </div>
      )}

      {form && (
        <form className="card panel" onSubmit={submitAccount} aria-label={form.mode === "create" ? "Form tambah akun" : "Form edit akun"}>
          <div className="panel-header">
            <h2 className="panel-title">
              {form.mode === "create" ? "Tambah akun" : `Edit akun — ${form.label || "akun"}`}
            </h2>
            <button className="table-action" type="button" onClick={closeForm} aria-label="Tutup formulir akun">
              <X size={13} />
            </button>
          </div>
          <div className="form-grid" style={{ padding: 18 }}>
            <div className="field">
              <label className="label" htmlFor="account-product">Produk</label>
              {form.mode === "create" ? (
                <select
                  className="input"
                  id="account-product"
                  value={form.productId}
                  onChange={(event) => setForm({ ...form, productId: event.target.value })}
                  required
                >
                  <option value="">Pilih produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  id="account-product"
                  value={productOptions.find((product) => product.id === form.productId)?.name ?? "Produk akun"}
                  readOnly
                  aria-readonly="true"
                />
              )}
              <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                Produk akun tidak dapat diganti setelah dibuat.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="account-label">Label akun</label>
              <input
                className="input"
                id="account-label"
                value={form.label}
                onChange={(event) => setForm({ ...form, label: event.target.value })}
                placeholder="Contoh: Akun utama keluarga"
                maxLength={120}
                required
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="account-credentials">
                {form.mode === "create" ? "Kredensial akun" : "Kredensial baru (opsional)"}
              </label>
              <textarea
                className="input"
                id="account-credentials"
                name="credentials"
                rows={3}
                value={form.credentials}
                onChange={(event) => setForm({ ...form, credentials: event.target.value })}
                placeholder={
                  form.mode === "create"
                    ? "Email dan kata sandi akun"
                    : "Kosongkan bila tidak ingin mengganti kredensial"
                }
                autoComplete="off"
              />
              <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                Write-only: kredensial disimpan terenkripsi dan tidak pernah ditampilkan kembali.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="account-status">Status akun</label>
              <select
                className="input"
                id="account-status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as AccountStatus })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="account-sharing-limit">Limit sharing</label>
              <input
                className="input"
                id="account-sharing-limit"
                type="number"
                min="1"
                max="5"
                value={form.sharingLimit}
                onChange={(event) => setForm({ ...form, sharingLimit: event.target.value })}
                required
              />
              <p className="muted" style={{ margin: 0, fontSize: 11 }}>Satu akun maksimal untuk 5 pengguna.</p>
            </div>

            <div className="field">
              <label className="label" htmlFor="account-expiry">Kedaluwarsa akun</label>
              <input
                className="input"
                id="account-expiry"
                type="date"
                value={form.expires}
                onChange={(event) => setForm({ ...form, expires: event.target.value })}
              />
              <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                Opsional. Tanggal yang sudah tersimpan tidak dapat dihapus dari formulir ini.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="account-otp-secret">
                {form.mode === "create" ? "Secret OTP (opsional)" : "Secret OTP baru (opsional)"}
              </label>
              <input
                className="input"
                id="account-otp-secret"
                type="password"
                value={form.otpSecret}
                onChange={(event) => setForm({ ...form, otpSecret: event.target.value, clearOtp: false })}
                placeholder="Base32 TOTP, mis. JBSWY3DPEHPK3PXP"
                autoComplete="new-password"
                disabled={form.clearOtp}
              />
              <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                Secret hanya untuk ditulis dan tidak pernah ditampilkan kembali.
              </p>
              {form.mode === "edit" && accounts.find((item) => item.id === form.accountId)?.otpConfigured && (
                <label className="muted" style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 11 }}>
                  <input
                    type="checkbox"
                    checked={form.clearOtp}
                    onChange={(event) => setForm({ ...form, clearOtp: event.target.checked, otpSecret: "" })}
                  />
                  Hapus secret OTP yang tersimpan
                </label>
              )}
            </div>

            <div className="field" style={{ alignSelf: "end" }}>
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : form.mode === "create" ? "Simpan akun" : "Simpan perubahan"}
              </button>
            </div>

            {formError && (
              <p className="field" role="alert" style={{ color: "var(--danger)", fontSize: 11, margin: 0 }}>
                {formError}
              </p>
            )}
          </div>
        </form>
      )}

      {deleteTarget && (
        <div className="card panel" role="alertdialog" aria-modal="true" aria-label="Konfirmasi hapus akun">
          <div className="panel-header">
            <h2 className="panel-title">Hapus akun “{deleteTarget.account.label}”?</h2>
          </div>
          <p className="muted" style={{ margin: "0 0 14px", fontSize: 11 }}>
            Akun yang masih memiliki slot terpakai, dipesan, atau tertaut pesanan akan ditolak server (409).
            Tindakan ini tidak dapat dibatalkan.
          </p>
          {deleteTarget.error && (
            <p role="alert" style={{ margin: "0 0 12px", color: "var(--danger)", fontSize: 11 }}>
              {deleteTarget.error}
            </p>
          )}
          <div className="table-actions" style={{ justifyContent: "flex-start" }}>
            <button
              className="button button-primary button-sm"
              type="button"
              onClick={confirmDelete}
              disabled={submitting}
              style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
            >
              {submitting ? "Menghapus…" : "Ya, hapus akun"}
            </button>
            <button
              className="button button-secondary button-sm"
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={submitting}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {otp && (
        <div className="card panel" role="dialog" aria-modal="true" aria-label={`Kode OTP akun ${otp.label}`}>
          <div className="panel-header">
            <h2 className="panel-title">Kode OTP — {otp.label}</h2>
            <button className="table-action" type="button" onClick={() => setOtp(null)} aria-label="Tutup kode OTP">
              <X size={13} />
            </button>
          </div>
          {otp.loading ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Membuat kode OTP…</p>
          ) : otp.error ? (
            <div>
              <p role="alert" style={{ margin: "0 0 12px", color: "var(--danger)", fontSize: 12 }}>
                {otp.error}
              </p>
              <button
                className="button button-secondary button-sm"
                type="button"
                onClick={() => {
                  const account = accounts.find((item) => item.id === otp.accountId);
                  if (account) void requestOtp(account);
                }}
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div>
              <p
                className="tabular"
                aria-live="polite"
                style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700, letterSpacing: "0.24em" }}
              >
                {otp.code}
              </p>
              <p className="muted" style={{ margin: "0 0 12px", fontSize: 12 }}>
                {otp.remaining > 0 ? `Berlaku ${otp.remaining} detik` : "Kode kedaluwarsa"} · periode {otp.period} detik
              </p>
              <button
                className="button button-secondary button-sm"
                type="button"
                onClick={() => {
                  const account = accounts.find((item) => item.id === otp.accountId);
                  if (account) void requestOtp(account);
                }}
              >
                {otp.remaining > 0 ? "Buat ulang kode" : "Buat kode baru"}
              </button>
            </div>
          )}
          <p className="muted" style={{ margin: "12px 0 0", fontSize: 10 }}>
            Kode hanya ditampilkan di sini. Secret TOTP tidak pernah dikirim ke browser.
          </p>
        </div>
      )}

      {slotForm && (
        <form className="card panel" onSubmit={submitSlot} aria-label={`Form tambah slot ${slotForm.label}`}>
          <div className="panel-header">
            <h2 className="panel-title">Tambah slot — {slotForm.label}</h2>
            <button className="table-action" type="button" onClick={() => setSlotForm(null)} aria-label="Tutup form slot">
              <X size={13} />
            </button>
          </div>
          <div className="form-grid" style={{ padding: 18 }}>
            <div className="field">
              <label className="label" htmlFor="slot-price">Paket</label>
              <select
                className="input"
                id="slot-price"
                value={slotForm.priceId}
                onChange={(event) => setSlotForm({ ...slotForm, priceId: event.target.value, error: "" })}
                required
              >
                <option value="">Pilih paket</option>
                {(detailProduct?.prices ?? products.find((product) => product.id === slotAccount?.productId)?.prices ?? []).map(
                  (price) => (
                    <option key={price.id} value={price.id}>{price.label}</option>
                  ),
                )}
              </select>
              {slotAccount && slotAccount.remainingSlots === 0 && (
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  Sisa kapasitas akun ini 0. Naikkan limit sharing terlebih dahulu.
                </p>
              )}
            </div>
            <div className="field">
              <label className="label" htmlFor="slot-quantity">Jumlah slot</label>
              <input
                className="input"
                id="slot-quantity"
                type="number"
                min="1"
                max={slotAccount?.remainingSlots ?? 1}
                value={slotForm.quantity}
                onChange={(event) => setSlotForm({ ...slotForm, quantity: event.target.value, error: "" })}
                required
              />
              {slotAccount && (
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  Sisa kapasitas: {slotAccount.remainingSlots} slot dari limit {slotAccount.sharingLimit}.
                </p>
              )}
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || !slotAccount || slotAccount.remainingSlots === 0}
              >
                {submitting ? "Menyimpan…" : "Simpan slot"}
              </button>
            </div>
            {slotForm.error && (
              <p className="field" role="alert" style={{ color: "var(--danger)", fontSize: 11, margin: 0 }}>
                {slotForm.error}
              </p>
            )}
          </div>
        </form>
      )}

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={14} />
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari produk, label akun, atau status…"
            aria-label="Cari akun"
          />
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter status akun"
          style={{ maxWidth: 180 }}
        >
          <option value="all">Semua status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          className="input"
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          aria-label="Filter produk akun"
          style={{ maxWidth: 220 }}
        >
          <option value="all">Semua produk</option>
          {productOptions.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>

      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Akun</th>
                <th>Status</th>
                <th>Masa aktif</th>
                <th>Sharing</th>
                <th>Pengguna</th>
                <th>OTP</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center" }}>Memuat akun…</td>
                </tr>
              ) : visibleAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center" }}>
                    {accounts.length === 0
                      ? "Belum ada akun. Tambahkan akun untuk mulai menjual akses."
                      : "Tidak ada akun yang cocok dengan filter atau pencarian."}
                  </td>
                </tr>
              ) : (
                visibleAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="table-primary">{account.productName}</td>
                    <td>
                      <div>{account.label}</div>
                      {account.needsReview && (
                        <span className="badge badge-dot status-warning" style={{ marginTop: 4 }}>
                          Perlu review
                        </span>
                      )}
                    </td>
                    <td><StatusBadge status={account.status} /></td>
                    <td>
                      <div>{formatDate(account.expiresAt)}</div>
                      <span
                        className="muted"
                        style={{ color: account.daysRemaining !== null && account.daysRemaining <= 7 ? "var(--danger)" : undefined }}
                      >
                        {daysLabel(account.daysRemaining)}
                      </span>
                    </td>
                    <td>
                      <span className="tabular">{account.usedSlots}/{account.sharingLimit}</span>
                      <span className="muted"> · sisa {account.remainingSlots}</span>
                      <div
                        className="inventory-bar"
                        role="progressbar"
                        aria-label={`${account.usedSlots} dari ${account.sharingLimit} slot terpakai`}
                        aria-valuenow={account.usedSlots}
                        aria-valuemin={0}
                        aria-valuemax={account.sharingLimit}
                        style={{ marginTop: 5 }}
                      >
                        <span
                          style={{
                            width: `${Math.min(
                              account.sharingLimit > 0 ? (account.usedSlots / account.sharingLimit) * 100 : 0,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="tabular">{account.assignedUsers}</td>
                    <td>
                      <span className={`badge badge-dot ${account.otpConfigured ? "status-success" : "status-warning"}`}>
                        {account.otpConfigured ? "Siap" : "Belum"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => openDetail(account)}
                          title="Lihat detail akun"
                          aria-label={`Lihat detail akun ${account.label}`}
                          aria-expanded={detailId === account.id}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => void requestOtp(account)}
                          title="Buat kode OTP"
                          aria-label={`Buat OTP ${account.label}`}
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => openEditForm(account)}
                          title="Edit akun"
                          aria-label={`Edit akun ${account.label}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => setDeleteTarget({ account, error: null })}
                          title="Hapus akun"
                          aria-label={`Hapus akun ${account.label}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailId && (
        <section className="card panel" aria-label="Detail akun" aria-live="polite">
          <div className="panel-header">
            <h2 className="panel-title">
              Detail akun — {detailAccount?.label ?? "memuat…"}
            </h2>
            <div className="table-actions" style={{ justifyContent: "flex-end" }}>
              {detailAccount && (
                <>
                  <button
                    className="button button-secondary button-sm"
                    type="button"
                    onClick={() => openSlotForm(detailAccount)}
                    disabled={detailAccount.needsReview || !detailAccount.sellable || detailAccount.remainingSlots === 0}
                    title={
                      detailAccount.needsReview
                        ? "Akun perlu review: turunkan limit sharing ke 5 atau kurang sebelum menambah slot."
                        : detailAccount.remainingSlots === 0
                          ? "Kapasitas akun sudah penuh."
                          : undefined
                    }
                    aria-label={`Tambah slot ke ${detailAccount.label}`}
                  >
                    <Plus size={12} /> Tambah slot
                  </button>
                  <button
                    className="button button-secondary button-sm"
                    type="button"
                    onClick={() => openEditForm(detailAccount)}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </>
              )}
              <button
                className="table-action"
                type="button"
                onClick={() => {
                  setDetailId(null);
                  setDetail({ loading: false, error: null, account: null, slots: [] });
                  setSlotForm(null);
                }}
                aria-label="Tutup detail akun"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {detail.loading ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Memuat detail akun…</p>
          ) : detail.error ? (
            <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 12 }}>{detail.error}</p>
          ) : detailAccount ? (
            <>
              <div className="form-grid" style={{ marginBottom: 18 }}>
                <div>
                  <div className="muted" style={{ fontSize: 10 }}>Produk</div>
                  <div className="table-primary">{detailAccount.productName}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 10 }}>Status akun</div>
                  <StatusBadge status={detailAccount.status} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 10 }}>Masa aktif akun</div>
                  <div>{formatDate(detailAccount.expiresAt)}</div>
                  <span className="muted">{daysLabel(detailAccount.daysRemaining)}</span>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 10 }}>Pemakaian sharing</div>
                  <div className="tabular">
                    {detailAccount.usedSlots}/{detailAccount.sharingLimit} slot
                  </div>
                  <span className="muted">
                    {detailAccount.assignedUsers} pengguna · sisa {detailAccount.remainingSlots}
                  </span>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 10 }}>OTP</div>
                  <span className={`badge badge-dot ${detailAccount.otpConfigured ? "status-success" : "status-warning"}`}>
                    {detailAccount.otpConfigured ? "Siap" : "Belum dikonfigurasi"}
                  </span>
                </div>
              </div>

              {detailAccount.needsReview && (
                <div className="notice" role="alert" style={{ marginBottom: 18, color: "var(--danger)" }}>
                  Akun ini melebihi batas lima pengguna dari aturan lama. Slot yang sudah terjual tetap aman,
                  tetapi penambahan slot dinonaktifkan sampai limit sharing diturunkan ke 5 atau kurang.
                </div>
              )}

              <div className="panel-header" style={{ marginBottom: 10 }}>
                <h3 className="panel-title">Pengguna tertaut</h3>
                <span className="muted" style={{ fontSize: 10 }}>
                  {detailAccount.assignedUsers} user unik
                </span>
              </div>
              {users.length === 0 ? (
                <p className="muted" style={{ margin: "0 0 18px", fontSize: 11 }}>
                  Belum ada pengguna yang memakai akun ini.
                </p>
              ) : (
                <div className="table-scroll" style={{ marginBottom: 18 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Pesanan</th>
                        <th>Status bayar</th>
                        <th>Masa akses</th>
                        <th>Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((slot) => (
                        <tr key={slot.id}>
                          <td className="table-primary">{slot.name ?? "—"}</td>
                          <td>{slot.email ?? "—"}</td>
                          <td>
                            {slot.orderId && slot.orderNumber ? (
                              <a href={`/dashboard/orders/${slot.orderId}`}>{slot.orderNumber}</a>
                            ) : (
                              slot.orderNumber ?? "—"
                            )}
                          </td>
                          <td><StatusBadge status={paymentLabel(slot.paymentStatus)} /></td>
                          <td>{slot.accessExpiresAt ? formatDate(slot.accessExpiresAt) : "—"}</td>
                          <td>{slot.activatedAt ? daysLabel(slot.daysRemaining) : "Belum aktif"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="panel-header" style={{ marginBottom: 10 }}>
                <h3 className="panel-title">Daftar slot</h3>
                <span className="muted" style={{ fontSize: 10 }}>{detail.slots.length} slot</span>
              </div>
              {detail.slots.length === 0 ? (
                <p className="muted" style={{ margin: "0 0 18px", fontSize: 11 }}>Belum ada slot pada akun ini.</p>
              ) : (
                <div className="table-scroll" style={{ marginBottom: 18 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Paket</th>
                        <th>Status</th>
                        <th>Pesanan</th>
                        <th>Aktif sejak</th>
                        <th>Akses berakhir</th>
                        <th>Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.slots.map((slot) => (
                        <tr key={slot.id}>
                          <td>
                            {detailProduct?.prices.find((price) => price.id === slot.productPriceId)?.label ??
                              slot.productPriceId}
                          </td>
                          <td><StatusBadge status={slot.status} /></td>
                          <td>{slot.orderNumber ?? "—"}</td>
                          <td>{formatDateTime(slot.activatedAt)}</td>
                          <td>{slot.accessExpiresAt ? formatDate(slot.accessExpiresAt) : "—"}</td>
                          <td>{slot.activatedAt ? daysLabel(slot.daysRemaining) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="panel-header" style={{ marginBottom: 10 }}>
                <h3 className="panel-title">Riwayat slot</h3>
                <span className="muted" style={{ fontSize: 10 }}>Ditinjau dari data slot dan pesanan</span>
              </div>
              {history.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>Belum ada riwayat untuk akun ini.</p>
              ) : (
                <div className="activity-list">
                  {history.map((row) => (
                    <div key={row.key} className="activity-row">
                      <span className="activity-dot" aria-hidden="true" />
                      <div>
                        <div className="table-primary">{row.title}</div>
                        <div className="muted">{row.detail}</div>
                      </div>
                      <span className="muted">{formatDateTime(row.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {!loading && !loadError && accounts.length === 0 && !form && (
        <section
          className="card panel"
          style={{ display: "grid", placeItems: "center", gap: 8, padding: 36, textAlign: "center" }}
        >
          <UserRound size={24} />
          <h2 className="panel-title">Belum ada akun</h2>
          <p className="muted" style={{ margin: 0, fontSize: 11 }}>
            Tambahkan akun inventaris pertama agar pelanggan bisa membeli akses.
          </p>
          <button className="button button-primary button-sm" type="button" onClick={openCreateForm}>
            <Plus size={12} /> Tambah akun
          </button>
        </section>
      )}

      {detailId && (
        <p className="muted" style={{ margin: 0, fontSize: 10 }}>
          <ClipboardList size={11} /> Data akun tidak pernah memuat kredensial atau secret OTP.
        </p>
      )}
    </div>
  );
}
