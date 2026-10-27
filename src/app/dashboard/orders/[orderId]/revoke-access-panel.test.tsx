import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSearchableOption } from "@/test/searchable-select";

const { getImpactMock, revokeMock } = vi.hoisted(() => ({
  getImpactMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getOrderRevocationImpact: getImpactMock,
      revokeOrderAccess: revokeMock,
    },
  };
});

import { RevokeAccessPanel } from "./revoke-access-panel";

const deliveredAccount = {
  inventory_account_id: "acc-1",
  label: "Akun utama",
  account_email: "akun@example.test",
  other_active_users: 2,
};

describe("panel batalkan & cabut akses", () => {
  beforeEach(() => {
    getImpactMock.mockReset();
    revokeMock.mockReset();
    revokeMock.mockResolvedValue({
      order: { id: "order-1", status: "refunded" },
      accounts: [deliveredAccount],
      released_slots: 1,
    });
  });

  it("mewajibkan rotasi kata sandi dan konfirmasi dampak shared account", async () => {
    getImpactMock.mockResolvedValue({ accounts: [deliveredAccount] });
    const onSuccess = vi.fn();
    render(
      <RevokeAccessPanel orderId="order-1" orderStatus="delivered" onClose={vi.fn()} onSuccess={onSuccess} />,
    );

    await waitFor(() => expect(screen.getByText("Akun utama")).toBeInTheDocument());
    const submit = screen.getByRole("button", { name: /Konfirmasi batalkan/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Alasan/), { target: { value: "Pelanggan berhenti berlangganan" } });
    fireEvent.change(screen.getByLabelText(/Kata sandi baru di platform/), { target: { value: "SandiBaru123!" } });
    fireEvent.click(screen.getByLabelText(/Saya sudah mengganti kata sandi akun di platform/));
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Saya sudah memberi tahu/));
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    await waitFor(() =>
      expect(revokeMock).toHaveBeenCalledWith("order-1", {
        status: "refunded",
        reason: "Pelanggan berhenti berlangganan",
        provider_rotation_confirmed: true,
        shared_impact_acknowledged: true,
        new_passwords: { "acc-1": "SandiBaru123!" },
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("membatalkan pesanan yang belum dikirim tanpa meminta kata sandi", async () => {
    getImpactMock.mockResolvedValue({ accounts: [] });
    const onSuccess = vi.fn();
    render(
      <RevokeAccessPanel orderId="order-2" orderStatus="paid" onClose={vi.fn()} onSuccess={onSuccess} />,
    );

    await waitFor(() => expect(screen.getByText(/Akun belum pernah dikirim/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Alasan/), { target: { value: "Salah pilih paket" } });
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi batalkan/i }));

    await waitFor(() =>
      expect(revokeMock).toHaveBeenCalledWith("order-2", {
        status: "cancelled",
        reason: "Salah pilih paket",
        provider_rotation_confirmed: false,
        shared_impact_acknowledged: false,
        new_passwords: {},
      }),
    );
  });

  it("dapat mengganti status akhir lewat dropdown yang dipakai dashboard", async () => {
    getImpactMock.mockResolvedValue({ accounts: [] });
    render(
      <RevokeAccessPanel orderId="order-3" orderStatus="paid" onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    await waitFor(() => expect(screen.getByText(/Akun belum pernah dikirim/)).toBeInTheDocument());
    chooseSearchableOption("Status akhir", "Dikembalikan (refund)");
    fireEvent.change(screen.getByLabelText(/Alasan/), { target: { value: "Refund disetujui" } });
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi batalkan/i }));

    await waitFor(() =>
      expect(revokeMock).toHaveBeenCalledWith("order-3", expect.objectContaining({ status: "refunded" })),
    );
  });
});
