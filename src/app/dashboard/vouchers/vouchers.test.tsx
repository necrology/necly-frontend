import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listVouchersMock, updateVoucherMock, createVoucherMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listVouchersMock: vi.fn(),
  updateVoucherMock: vi.fn(),
  createVoucherMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: {
      ...actual.adminApi,
      listVouchers: listVouchersMock,
      updateVoucher: updateVoucherMock,
      createVoucher: createVoucherMock,
    },
  };
});

import VouchersPage from "./page";

const VOUCHER = {
  id: "0192f0e0-0000-0000-0000-000000000001",
  code: "HEMAT20K",
  type: "fixed",
  value: 20000,
  usage_limit: 50,
  ends_at: "2026-12-31T23:59:59Z",
  active: true,
};

describe("voucher admin (W18)", () => {
  beforeEach(() => {
    listVouchersMock.mockReset().mockResolvedValue({ vouchers: [VOUCHER], page: 1, per_page: 50, total: 1 });
    updateVoucherMock.mockReset().mockResolvedValue({ ...VOUCHER, active: false });
    createVoucherMock.mockReset().mockResolvedValue({ ...VOUCHER, code: "BARU10" });
    bootstrapAuthMock.mockReset().mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("memetakan tipe fixed dan usage_limit dari kontrak backend", async () => {
    render(<VouchersPage />);

    expect(await screen.findByText("HEMAT20K")).toBeInTheDocument();
    expect(screen.getByText("Nominal")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Hubungkan ke API admin/)).not.toBeInTheDocument();
  });

  it("mengubah status voucher melalui PATCH dengan ID server", async () => {
    render(<VouchersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Nonaktifkan HEMAT20K" }));

    await waitFor(() =>
      expect(updateVoucherMock).toHaveBeenCalledWith(VOUCHER.id, { active: false }),
    );
    expect(await screen.findByText(/Voucher HEMAT20K dinonaktifkan/)).toBeInTheDocument();
  });

  it("membuat voucher lewat endpoint admin dengan tipe percentage", async () => {
    render(<VouchersPage />);
    await screen.findByText("HEMAT20K");

    fireEvent.click(screen.getByRole("button", { name: /Buat voucher/ }));
    fireEvent.change(screen.getByLabelText("Kode"), { target: { value: "baru10" } });
    fireEvent.change(screen.getByLabelText("Nilai"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Batas penggunaan"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan voucher" }));

    await waitFor(() => expect(createVoucherMock).toHaveBeenCalledTimes(1));
    expect(createVoucherMock.mock.calls[0]?.[0]).toMatchObject({
      code: "BARU10",
      type: "percentage",
      value: 10,
      usage_limit: 25,
      active: true,
    });
  });
});
