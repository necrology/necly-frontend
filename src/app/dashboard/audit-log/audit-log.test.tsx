import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAuditLogsMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listAuditLogsMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: { ...actual.adminApi, listAuditLogs: listAuditLogsMock },
  };
});

import AuditLogPage from "./page";

const FIXTURE = {
  id: "0192f0d0-0000-0000-0000-000000000001",
  actor_user_id: "0192f0c0-0000-0000-0000-000000000001",
  actor_user: { id: "0192f0c0-0000-0000-0000-000000000001", name: "Fixture Customer", email: "fixture.customer@example.test", role: "customer" },
  action: "auth.login.succeeded",
  resource_type: "user",
  resource_id: "0192f0c0-0000-0000-0000-000000000001",
  ip_address: "203.0.113.10",
  metadata: null,
  created_at: "2026-10-18T09:00:00Z",
};

describe("audit log admin (C12/C19)", () => {
  beforeEach(() => {
    listAuditLogsMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    listAuditLogsMock.mockResolvedValue({ logs: [FIXTURE], page: 1, per_page: 50, total: 1 });
  });

  it("menampilkan aktor, aksi, resource, IP, dan waktu WIB persis dari DTO", async () => {
    render(<AuditLogPage />);

    expect((await screen.findAllByText("Fixture Customer")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("auth.login.succeeded").length).toBeGreaterThan(0);
    expect(screen.getByText("user · 0192f0c0-0000-0000-0000-000000000001")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.10")).toBeInTheDocument();
    // 09:00 UTC = 16:00 WIB, terlepas dari zona waktu mesin uji.
    expect(screen.getByText(/16\.00/)).toBeInTheDocument();
    expect(listAuditLogsMock).toHaveBeenCalledWith({ page: 1, per_page: 50 });
  });

  it("menampilkan keadaan kosong yang sah sebagai 200 tanpa error", async () => {
    listAuditLogsMock.mockResolvedValue({ logs: [], page: 1, per_page: 50, total: 0 });
    render(<AuditLogPage />);

    expect(await screen.findByText("Belum ada aktivitas tercatat.")).toBeInTheDocument();
    expect(screen.queryByText(/Gagal memuat audit log/)).not.toBeInTheDocument();
  });

  it("menampilkan error saat bentuk respons tidak sesuai kontrak", async () => {
    listAuditLogsMock.mockResolvedValue({ auditLogs: [FIXTURE], page: 1, per_page: 50, total: 1 });
    render(<AuditLogPage />);

    expect(await screen.findByText(/tidak sesuai kontrak/)).toBeInTheDocument();
  });

  it("menampilkan error saat DTO audit kehilangan field wajib", async () => {
    listAuditLogsMock.mockResolvedValue({ logs: [{ ...FIXTURE, action: undefined }], page: 1, per_page: 50, total: 1 });
    render(<AuditLogPage />);

    expect(await screen.findByText(/Gagal memproses data audit log/)).toBeInTheDocument();
  });

  it("tidak meminta data audit untuk penjual", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "seller-1", role: "seller" });
    render(<AuditLogPage />);

    expect(await screen.findByText(/hanya admin yang dapat melihat audit log/)).toBeInTheDocument();
    expect(listAuditLogsMock).not.toHaveBeenCalled();
  });
});
