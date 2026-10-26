import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSearchableOption } from "@/test/searchable-select";
import IssueReportPage from "./page";

const { createMock, ReportApiErrorMock } = vi.hoisted(() => {
  class ReportApiError extends Error {
    readonly status: number;
    readonly payload: unknown;
    readonly fields: Record<string, string>;
    readonly retryAfterSeconds: number | null;

    constructor(message: string, status: number, fields: Record<string, string> = {}, retryAfterSeconds: number | null = null) {
      super(message);
      this.name = "ReportApiError";
      this.status = status;
      this.payload = { error: message };
      this.fields = fields;
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
  return { createMock: vi.fn(), ReportApiErrorMock: ReportApiError };
});

vi.mock("@/lib/api", () => ({
  DEMO_MODE: false,
  reportsApi: { create: createMock },
  ReportApiError: ReportApiErrorMock,
}));

function fillForm(overrides: Record<string, string> = {}) {
  const values = {
    name: "Budi",
    email: "budi@example.com",
    order: "NCL-2026-0001",
    category: "Akses layanan",
    message: "Akses belum diberikan sejak kemarin malam.",
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText(/^Nama/), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText(/^Nomor pesanan/), { target: { value: values.order } });
  chooseSearchableOption(/^Kategori kendala/, values.category);
  fireEvent.change(screen.getByLabelText(/^Jelaskan kendala/), { target: { value: values.message } });
}

async function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Kirim laporan" }));
  await waitFor(() => expect(createMock).toHaveBeenCalled());
}

describe("halaman Laporan Kendala", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("mengirim laporan dengan nama field yang diharapkan backend", async () => {
    createMock.mockResolvedValue({ message: "Laporan kendala diterima", report: { id: "rep-1" } });
    render(<IssueReportPage />);

    fillForm();
    await submit();

    expect(createMock).toHaveBeenCalledWith({
      name: "Budi",
      email: "budi@example.com",
      order_number: "NCL-2026-0001",
      category: "Akses layanan",
      message: "Akses belum diberikan sejak kemarin malam.",
    });
  });

  // QA baris 55: email dan nomor pesanan yang tidak cocok harus memunculkan
  // pesan persis seperti yang diminta, bukan sekadar sukses palsu.
  it("menampilkan pesan dari backend saat nomor pesanan dan email tidak cocok", async () => {
    const copy = "nomor pesanan dan email tidak sesuai, cek kembali email yang digunakan untuk memesan, atau no pesanan anda";
    createMock.mockRejectedValue(new ReportApiErrorMock(copy, 422));
    render(<IssueReportPage />);

    fillForm({ order: "NCL-9999-9999" });
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(copy);
    expect(screen.queryByText("Laporan Diterima")).not.toBeInTheDocument();
  });

  it("menampilkan pesan validasi per-field dari backend", async () => {
    createMock.mockRejectedValue(new ReportApiErrorMock("Data laporan belum lengkap atau tidak valid", 422, {
      email: "Masukkan alamat email yang valid.",
      order_number: "Nomor pesanan tidak ditemukan.",
    }));
    render(<IssueReportPage />);

    fillForm();
    await submit();

    expect(await screen.findByText("Masukkan alamat email yang valid.")).toBeInTheDocument();
    expect(screen.getByText("Nomor pesanan tidak ditemukan.")).toBeInTheDocument();
  });

  // QA baris 57: laporan berulang dalam 3 jam ditolak, dan alasannya dijelaskan.
  it("menjelaskan cooldown 3 jam saat backend menolak dengan 429", async () => {
    createMock.mockRejectedValue(new ReportApiErrorMock("Laporan kendala dari email ini baru saja dikirim. Silakan coba lagi dalam 172 menit.", 429, {}, 10320));
    render(<IssueReportPage />);

    fillForm();
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("baru saja dikirim");
    expect(screen.queryByText(/laporan berikutnya dapat dikirim kembali setelah 3 jam/)).not.toBeInTheDocument();
  });

  // QA baris 56 & 57: layar sukses menampilkan ceklis dan hanya tombol kembali.
  it("menampilkan ceklis di samping judul dan tombol Beranda pada laporan pertama", async () => {
    createMock.mockResolvedValue({ message: "Laporan kendala diterima", report: { id: "rep-1" } });
    render(<IssueReportPage />);

    fillForm();
    await submit();

    expect(await screen.findByText("Laporan Diterima")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Laporan berhasil dikirim" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Beranda$/ })).toHaveAttribute("href", "/");
    expect(screen.queryByText(/Kirim laporan lain/)).not.toBeInTheDocument();
    expect(screen.getByText(/laporan berikutnya dapat dikirim kembali setelah 3 jam/)).toBeInTheDocument();
  });

  it("memvalidasi field wajib sebelum menghubungi backend", () => {
    render(<IssueReportPage />);

    fireEvent.click(screen.getByRole("button", { name: "Kirim laporan" }));

    expect(createMock).not.toHaveBeenCalled();
    expect(screen.getByText("Nama wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Nomor pesanan wajib diisi.")).toBeInTheDocument();
  });
});
