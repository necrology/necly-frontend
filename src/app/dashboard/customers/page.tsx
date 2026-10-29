"use client";

import { Search, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusBadge } from "@/components/status-badge";
import { customers } from "@/data/seed";
import { formatDateID, formatIDR } from "@/lib/money";
import { ApiError, adminApi, bootstrapAuth, DEMO_MODE } from "@/lib/api";
import { mapApiUserToCustomer } from "@/lib/admin-mappers";
import type { Customer } from "@/lib/types";
import type { ApiUser } from "@/lib/api";
import { useSearchQueryParam } from "@/lib/use-search-query-param";

type UserRole = "customer" | "seller" | "admin";

/**
 * Baris tabel memerlukan role mentah dan status aktif dari API; `Customer`
 * hanya menyimpan label bahasa Indonesia untuk tampilan.
 */
type AccessRow = Customer & {
  roleValue: UserRole;
  active: boolean;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "customer", label: "Pelanggan" },
  { value: "seller", label: "Penjual" },
  { value: "admin", label: "Admin" },
];

const ROLE_LABELS = {
  customer: "Pelanggan",
  seller: "Penjual",
  admin: "Admin",
} as const satisfies Record<UserRole, Customer["role"]>;

const STATUS_FILTERS = ["Semua", "Aktif", "Baru", "Nonaktif"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function accessRowFromApi(apiUser: ApiUser): AccessRow {
  return {
    ...mapApiUserToCustomer(apiUser),
    roleValue: apiUser.role,
    active: apiUser.active !== false,
  };
}

function accessRowFromSeed(customer: Customer): AccessRow {
  const roleValue: UserRole = customer.role === "Admin" ? "admin" : customer.role === "Penjual" ? "seller" : "customer";
  return { ...customer, roleValue, active: customer.status !== "Nonaktif" };
}

function describeAccessError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return error.message || "Data perubahan tidak valid.";
      case 401:
        // Samakan pola dengan 400/403/409: pesan backend dipakai apa adanya,
        // teks tetap hanya sebagai cadangan bila backend tidak mengirim pesan.
        return error.message || "Sesi berakhir. Silakan masuk kembali lalu coba lagi.";
      case 403:
        // Pesan backend adalah sumber kebenaran untuk self-demotion/last-admin.
        return error.message || "Anda tidak diizinkan mengubah akses pengguna ini.";
      case 404:
        return error.message || "Pengguna tidak ditemukan. Muat ulang daftar pengguna.";
      case 409:
        return error.message || "Perubahan bertentangan dengan data pengguna saat ini.";
      default:
        return `Gagal memperbarui akses (HTTP ${error.status}): ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : "Gagal memperbarui akses pengguna.";
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  useSearchQueryParam(setQuery);
  const [status, setStatus] = useState<StatusFilter>("Semua");
  const [role, setRole] = useState<"Semua" | UserRole>("Semua");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiUsers, setApiUsers] = useState<ApiUser[] | null>(null);
  const [activeAdminCount, setActiveAdminCount] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(DEMO_MODE ? "USR-0991" : null);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Data seed hanya dipakai di mode demo. Di mode live seluruh baris berasal
  // dari endpoint /admin/users.
  const [demoRows, setDemoRows] = useState<AccessRow[]>(() => customers.map(accessRowFromSeed));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("customer");
  const [draftActive, setDraftActive] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) return;

    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      try {
        const user = await bootstrapAuth();
        if (cancelled) return;

        if (!user) {
          setError("Sesi tidak valid. Silakan masuk kembali.");
          return;
        }
        if (user.role !== "admin") {
          // Jangan memicu request data admin untuk sesi non-admin.
          setError("Akses ditolak: hanya admin yang dapat mengelola pengguna");
          return;
        }

        setCurrentUserId(user.id);

        const [usersResponse, adminsResponse] = await Promise.all([
          adminApi.listUsers({ page: 1, per_page: 100 }),
          // Jumlah admin aktif dipakai untuk menyembunyikan aksi yang pasti
          // ditolak backend (admin aktif terakhir). Backend tetap sumber kebenaran.
          adminApi.listUsers({ page: 1, per_page: 100, role: "admin", active: true }),
        ]);
        if (cancelled) return;

        if (!Array.isArray(usersResponse.users) || !Array.isArray(adminsResponse.users)) {
          setError("Respons pengguna dari server tidak sesuai kontrak");
          return;
        }

        setApiUsers(usersResponse.users);
        setActiveAdminCount(
          typeof adminsResponse.total === "number"
            ? adminsResponse.total
            : adminsResponse.users.filter((item) => item.role === "admin" && item.active !== false).length,
        );
      } catch {
        if (!cancelled) setError("Gagal memuat pengguna dari server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const sourceRows = useMemo<AccessRow[]>(() => {
    if (DEMO_MODE) return demoRows;
    return (apiUsers ?? []).map(accessRowFromApi);
  }, [apiUsers, demoRows]);

  const rows = useMemo(
    () =>
      sourceRows.filter((row) => {
        const statusMatch = status === "Semua" || row.status === status;
        const roleMatch = role === "Semua" || row.roleValue === role;
        const queryMatch = `${row.name} ${row.email}`.toLowerCase().includes(query.trim().toLowerCase());
        return statusMatch && roleMatch && queryMatch;
      }),
    [query, status, role, sourceRows],
  );

  const selectedRow = useMemo(
    () => sourceRows.find((row) => row.id === selectedId) ?? null,
    [selectedId, sourceRows],
  );

  const effectiveActiveAdminCount = useMemo(() => {
    if (DEMO_MODE) {
      return demoRows.filter((row) => row.roleValue === "admin" && row.active).length;
    }
    return activeAdminCount;
  }, [activeAdminCount, demoRows]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }, []);

  const openManage = (row: AccessRow) => {
    setSelectedId(row.id);
    setDraftRole(row.roleValue);
    setDraftActive(row.active);
    setConfirming(false);
    setActionError("");
    setNotice("");
  };

  const closeManage = () => {
    setSelectedId(null);
    setConfirming(false);
    setActionError("");
  };

  const isSelf = selectedRow ? selectedRow.id === currentUserId : false;
  const isLastActiveAdmin = selectedRow
    ? selectedRow.roleValue === "admin" && selectedRow.active && effectiveActiveAdminCount === 1
    : false;

  const roleChanged = selectedRow ? draftRole !== selectedRow.roleValue : false;
  const activeChanged = selectedRow ? draftActive !== selectedRow.active : false;

  const changeSummary = [
    roleChanged && selectedRow
      ? `peran dari ${ROLE_LABELS[selectedRow.roleValue]} menjadi ${ROLE_LABELS[draftRole]}`
      : null,
    activeChanged ? (draftActive ? "mengaktifkan akun" : "menonaktifkan akun") : null,
  ]
    .filter(Boolean)
    .join(" dan ");

  const submitChanges = async (row: AccessRow) => {
    const payload: Record<string, unknown> = {};
    if (roleChanged) payload.role = draftRole;
    if (activeChanged) payload.active = draftActive;

    setSubmitting(true);
    setActionError("");

    try {
      if (DEMO_MODE) {
        setDemoRows((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  roleValue: draftRole,
                  role: ROLE_LABELS[draftRole],
                  active: draftActive,
                  status: draftActive ? (item.verified ? "Aktif" : "Baru") : "Nonaktif",
                }
              : item,
          ),
        );
      } else {
        await adminApi.updateUser(row.id, payload);
        // Selalu ambil ulang daftar setelah sukses supaya status/role yang
        // tampil berasal dari server, bukan hanya dugaan lokal.
        setReloadToken((value) => value + 1);
      }

      flash(
        `Akses ${row.name} diperbarui: peran ${ROLE_LABELS[draftRole]}, status ${draftActive ? "Aktif" : "Nonaktif"}.`,
      );
      setSelectedId(null);
      setConfirming(false);
    } catch (err) {
      setActionError(describeAccessError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRow || submitting) return;

    if (isSelf) {
      setActionError("Anda tidak dapat mengubah peran atau menonaktifkan akun sendiri.");
      return;
    }

    if (!roleChanged && !activeChanged) {
      setActionError("Tidak ada perubahan untuk disimpan.");
      setConfirming(false);
      return;
    }

    if (isLastActiveAdmin && (!draftActive || draftRole !== "admin")) {
      setActionError("Admin aktif terakhir tidak dapat diturunkan atau dinonaktifkan.");
      setConfirming(false);
      return;
    }

    if (!confirming) {
      // Langkah pertama hanya menampilkan ringkasan konfirmasi; belum ada
      // request yang dikirim ke server.
      setActionError("");
      setConfirming(true);
      return;
    }

    void submitChanges(selectedRow);
  };

  if (error && !DEMO_MODE) {
    return (
      <div className="dashboard-page" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 380 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Tidak dapat memuat pengguna</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            {error}
          </p>
          <button
            className="button button-primary button-sm"
            onClick={() => setReloadToken((value) => value + 1)}
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
        title="Pelanggan"
        description="Kelola peran dan status aktif pengguna. Perubahan akses tercatat di audit log."
      />
      <section className="metric-grid">
        <MetricCard label="Total pengguna" value={String(sourceRows.length)} change="Seluruh akun terdaftar" />
        <MetricCard label="Akun aktif" value={String(sourceRows.filter((row) => row.active).length)} change="Dapat masuk ke aplikasi" />
        <MetricCard label="Terverifikasi" value={String(sourceRows.filter((row) => row.verified).length)} change="Email terkonfirmasi" />
        <MetricCard
          label="Admin aktif"
          value={String(sourceRows.filter((row) => row.roleValue === "admin" && row.active).length)}
          change="Dapat mengelola akses"
        />
      </section>
      {notice && <div className="notice success" role="status">{notice}</div>}

      {selectedRow && (
        <Modal
          title={`Kelola akses — ${selectedRow.name}`}
          description={selectedRow.email}
          onClose={closeManage}
          footer={
            confirming ? (
              <>
                <button className="button button-secondary" type="button" onClick={() => setConfirming(false)} disabled={submitting}>
                  Periksa lagi
                </button>
                <button className="button button-primary" type="submit" form="access-form" disabled={submitting}>
                  {submitting ? "Menyimpan…" : "Ya, terapkan perubahan"}
                </button>
              </>
            ) : (
              <>
                <button className="button button-secondary" type="button" onClick={closeManage} disabled={submitting}>
                  Batal
                </button>
                <button className="button button-primary" type="submit" form="access-form" disabled={submitting}>
                  Simpan perubahan
                </button>
              </>
            )
          }
        >
          <form id="access-form" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="access-role">Peran</label>
                <SearchableSelect
                  inputId="access-role"
                  ariaLabel="Peran"
                  value={draftRole}
                  onChange={(value) => {
                    setDraftRole(value as UserRole);
                    setConfirming(false);
                  }}
                  isDisabled={submitting}
                  options={ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                />
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  Role menentukan menu dashboard yang dapat diakses pengguna.
                </p>
              </div>
              <div className="field">
                <label className="label" htmlFor="access-active">Status akun</label>
                <SearchableSelect
                  inputId="access-active"
                  ariaLabel="Status akun"
                  value={draftActive ? "aktif" : "nonaktif"}
                  onChange={(value) => {
                    setDraftActive(value === "aktif");
                    setConfirming(false);
                  }}
                  isDisabled={submitting}
                  options={[{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }]}
                />
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  Akun nonaktif tidak dapat masuk sampai diaktifkan kembali oleh admin.
                </p>
              </div>

              {actionError && (
                <div
                  className="notice field-full"
                  role="alert"
                  style={{ color: "var(--danger)", borderColor: "#ffd1cc", background: "var(--danger-bg)" }}
                >
                  {actionError}
                </div>
              )}

              {confirming && changeSummary && (
                <div className="notice field-full" role="status">
                  Konfirmasi: Anda akan mengubah {changeSummary} untuk <strong>{selectedRow.name}</strong>. Perubahan langsung berlaku.
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      <div className="toolbar">
        <div className="input-wrap"><Search size={14} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau email pengguna…" /></div>
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter status akun"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          options={STATUS_FILTERS.map((value) => ({ value, label: value }))}
        />
        <SearchableSelect
          className="toolbar-select"
          ariaLabel="Filter peran"
          value={role}
          onChange={(value) => setRole(value as "Semua" | UserRole)}
          options={[
            { value: "Semua", label: "Semua peran" },
            ...ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
          ]}
        />
        <span className="muted" style={{ fontSize: 9 }}>{rows.length} pengguna</span>
        {loading && <span className="skeleton" style={{ width: 60, height: 16 }} />}
      </div>
      <section className="card table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Status</th>
                <th>Peran</th>
                <th>Terverifikasi</th>
                <th>Pesanan</th>
                <th>Total belanja</th>
                <th>Bergabung</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr><td colSpan={8} className="muted" style={{ textAlign: "center" }}>Belum ada pelanggan. Sesuaikan filter untuk melihat akun lain.</td></tr>
              ) : rows.map((row) => {
                const self = row.id === currentUserId;
                const lastAdmin = row.roleValue === "admin" && row.active && effectiveActiveAdminCount === 1;
                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="avatar" style={{ width: 32, height: 32, fontSize: 8 }}>{row.initials}</span>
                        <span>
                          <span className="table-primary">{row.name}</span>
                          <br />
                          <span className="table-secondary">{row.email}</span>
                        </span>
                      </div>
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>{row.role}</td>
                    <td><span className={`badge ${row.verified ? "status-success" : "status-warning"}`}>{row.verified ? "Ya" : "Belum"}</span></td>
                    <td className="tabular">{row.orders}</td>
                    <td className="tabular">{formatIDR(row.spend)}</td>
                    <td>{formatDateID(row.joined)}</td>
                    <td>
                      {self ? (
                        <span className="muted" style={{ fontSize: 10 }}>Akun Anda</span>
                      ) : lastAdmin ? (
                        <span className="muted" style={{ fontSize: 10 }}>Admin aktif terakhir</span>
                      ) : (
                        <button
                          className="button button-secondary button-sm"
                          type="button"
                          onClick={() => openManage(row)}
                          aria-label={`Kelola akses ${row.name}`}
                        >
                          <UserCog size={12} /> Kelola
                        </button>
                      )}
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
