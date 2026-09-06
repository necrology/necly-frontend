import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardNav } from "./dashboard-nav";
import { DashboardTopbar } from "./dashboard-topbar";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

afterEach(cleanup);

describe("dashboard localization", () => {
  it("uses Indonesian navigation and topbar labels", () => {
    render(<><DashboardNav /><DashboardTopbar /></>);
    expect(screen.getByText("Ringkasan")).toBeInTheDocument();
    expect(screen.getByText("Pesanan")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cari pesanan, pelanggan, atau produk…")).toBeInTheDocument();
    expect(screen.getByLabelText("Notifikasi")).toBeInTheDocument();
  });

  it("menjelaskan sumber data tanpa mengesankan data contoh sebagai data nyata", () => {
    render(<PageHeader title="Pesanan" description="Kelola pesanan" />);
    expect(screen.getByText(/(Mode simulasi — data contoh, bukan data nyata|Data operasional langsung)/)).toBeInTheDocument();
  });

  it.each([
    ["pending_payment", "Menunggu pembayaran"],
    ["processing", "Diproses"],
    ["completed", "Selesai"],
    ["cancelled", "Dibatalkan"],
    ["refunded", "Dikembalikan"],
    ["inactive", "Nonaktif"],
  ])("menerjemahkan status API %s menjadi %s", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText(status)).not.toBeInTheDocument();
  });

  it("tidak menampilkan status asing yang belum dipetakan", () => {
    render(<StatusBadge status="awaiting_manual_review" />);
    expect(screen.getByText("Status lainnya")).toBeInTheDocument();
    expect(screen.queryByText("awaiting_manual_review")).not.toBeInTheDocument();
  });
});
