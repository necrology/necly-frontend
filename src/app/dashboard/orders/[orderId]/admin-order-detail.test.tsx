import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getOrderMock,
  bootstrapAuthMock,
  listOrdersMock,
  approveDeliveryMock,
  retryDeliveryMock,
  getDeliveryOptionsMock,
  assignAccountMock,
  replaceAccountMock,
} = vi.hoisted(() => ({
  getOrderMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
  listOrdersMock: vi.fn(),
  approveDeliveryMock: vi.fn(),
  retryDeliveryMock: vi.fn(),
  getDeliveryOptionsMock: vi.fn(),
  assignAccountMock: vi.fn(),
  replaceAccountMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: {
      ...actual.adminApi,
      getOrder: getOrderMock,
      listOrders: listOrdersMock,
      approveOrderDelivery: approveDeliveryMock,
      retryOrderDelivery: retryDeliveryMock,
      getOrderDeliveryOptions: getDeliveryOptionsMock,
      assignOrderDeliveryAccount: assignAccountMock,
      replaceOrderDeliveryAccount: replaceAccountMock,
    },
  };
});

import { ApiError } from "@/lib/api";
import { AdminOrderDetail } from "./admin-order-detail";

const ORDER_ID = "0192f0b0-0000-0000-0000-000000000001";
const DELIVERY_ID = "0192f0d0-0000-0000-0000-000000000001";

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    number: "ORD-1760832000000-0192f0b0",
    user_id: "0192f0c0-0000-0000-0000-000000000001",
    status: "paid",
    subtotal: 186000,
    discount: 18600,
    total: 167400,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:05:00Z",
    customer: { id: "cust-1", name: "Fixture Customer", email: "fixture.customer@example.test" },
    items: [{
      id: "item-1",
      product_price_id: "price-1",
      product_name: "Netflix Premium",
      duration_name: "1 Bulan",
      unit_price: 186000,
      quantity: 1,
      device_count: 1,
      line_total: 186000,
    }],
    payments: [{
      id: "pay-1",
      order_id: ORDER_ID,
      provider: "xendit",
      provider_payment_id: "ps-fixture-1",
      status: "paid",
      amount: 167400,
      paid_at: "2026-10-18T10:05:00Z",
      created_at: "2026-10-18T10:00:00Z",
      updated_at: "2026-10-18T10:05:00Z",
    }],
    ...overrides,
  };
}

function delivery(overrides: Record<string, unknown> = {}) {
  return {
    id: DELIVERY_ID,
    order_id: ORDER_ID,
    order_item_id: "item-1",
    status: "sent",
    attempts: 1,
    sent_at: "2026-10-18T10:06:00Z",
    created_at: "2026-10-18T10:05:00Z",
    updated_at: "2026-10-18T10:06:00Z",
    ...overrides,
  };
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    inventory_account_id: "acc-available",
    label: "Akun Baru",
    status: "active",
    expires_at: "2099-12-31T23:59:59Z",
    days_remaining: 20,
    sharing_limit: 5,
    assigned_users: 1,
    used_slots: 1,
    remaining_slots: 4,
    used_by_customer: false,
    assigned_to_item: false,
    can_assign: true,
    ...overrides,
  };
}

function deliveryItem(overrides: Record<string, unknown> = {}) {
  return {
    delivery_id: DELIVERY_ID,
    order_item_id: "item-1",
    product_id: "product-1",
    product_price_id: "price-1",
    product_name: "Netflix Premium",
    duration_name: "1 Bulan",
    quantity: 1,
    assigned_account_ids: [],
    accounts: [
      account(),
      account({
        inventory_account_id: "acc-used",
        label: "Akun Dipakai",
        used_by_customer: true,
        can_assign: false,
      }),
    ],
    ...overrides,
  };
}

describe("detail pesanan admin (C19)", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
    listOrdersMock.mockReset();
    approveDeliveryMock.mockReset();
    retryDeliveryMock.mockReset();
    getDeliveryOptionsMock.mockReset();
    assignAccountMock.mockReset();
    replaceAccountMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    getOrderMock.mockResolvedValue(order());
  });

  it("menampilkan data pesanan, status pembayaran, metode, dan waktu dari API", async () => {
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Pesanan ORD-1760832000000-0192f0b0")).toBeInTheDocument();
    expect(screen.getAllByText("Rp167.400").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Netflix Premium")).toBeInTheDocument();
    expect(screen.getByText("xendit")).toBeInTheDocument();
    expect(screen.getByText("ps-fixture-1")).toBeInTheDocument();
    expect(screen.getByText("Fixture Customer")).toBeInTheDocument();
    expect(screen.getByText("Sudah dibayar")).toBeInTheDocument();
    expect(screen.getByText("Xendit")).toBeInTheDocument();
    expect(screen.getAllByText("18/10/2026, 17.05 WIB").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(getOrderMock).toHaveBeenCalledWith(ORDER_ID);
  });

  it("menampilkan pembayaran yang belum lunas tanpa mengarang status dibayar", async () => {
    getOrderMock.mockResolvedValue(order({
      payment_status: "pending",
      payments: [{
        id: "pay-1",
        order_id: ORDER_ID,
        provider: "xendit",
        provider_payment_id: "ps-pending",
        status: "pending",
        amount: 167400,
        paid_at: null,
        created_at: "2026-10-18T10:00:00Z",
        updated_at: "2026-10-18T10:00:00Z",
      }],
    }));
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Belum dibayar")).toBeInTheDocument();
    expect(screen.queryByText("Sudah dibayar")).not.toBeInTheDocument();
  });

  it("menampilkan 404 sebagai pesanan tidak ditemukan tanpa data karangan", async () => {
    getOrderMock.mockRejectedValue(new ApiError("Pesanan tidak ditemukan", 404, { code: "not_found" }));
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Pesanan tidak ditemukan")).toBeInTheDocument();
    expect(screen.queryByText("Netflix Premium")).not.toBeInTheDocument();
  });

  it("memetakan 403 menjadi akses ditolak, bukan pesanan tidak ditemukan", async () => {
    getOrderMock.mockRejectedValue(new ApiError("Forbidden", 403, { code: "forbidden" }));
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.queryByText("Pesanan tidak ditemukan")).not.toBeInTheDocument();
  });

  it("menolak id bukan UUID tanpa memanggil API", async () => {
    render(<AdminOrderDetail orderId="not-a-uuid" />);

    expect(await screen.findByText("Pesanan tidak ditemukan")).toBeInTheDocument();
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("tidak meminta detail pesanan untuk penjual", async () => {
    bootstrapAuthMock.mockResolvedValue({ id: "seller-1", role: "seller" });
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("menampilkan error yang jelas saat API gagal", async () => {
    getOrderMock.mockRejectedValue(new Error("network"));
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getByText(/Gagal memuat detail pesanan/)).toBeInTheDocument());
  });

  it("menampilkan kapasitas akun dan menonaktifkan akun yang sudah dipakai user", async () => {
    getDeliveryOptionsMock.mockResolvedValue({ items: [deliveryItem()] });
    render(<AdminOrderDetail orderId={ORDER_ID} />);

    fireEvent.click(await screen.findByRole("button", { name: /Setujui & kirim akun/ }));

    expect(await screen.findByText("Pilih akun untuk dikirim")).toBeInTheDocument();
    expect(screen.getAllByText("Pemakaian 1/5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Slot tersisa 4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sudah dipakai user ini").length).toBeGreaterThanOrEqual(1);

    const usedRadio = screen.getByRole("radio", { name: /Akun Dipakai/ });
    expect(usedRadio).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Akun Baru/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Simpan akun & kirim/ })).toBeEnabled();
    expect(getDeliveryOptionsMock).toHaveBeenCalledWith(ORDER_ID);
  });

  it("mengirim payload assign yang benar lalu menyetujui pengiriman", async () => {
    const updated = order({
      status: "processing",
      deliveries: [delivery({
        assigned_accounts: [{
          inventory_account_id: "acc-available",
          label: "Akun Baru",
          status: "active",
          activated_at: "2026-10-18T10:06:00Z",
          access_expires_at: "2026-11-17T10:06:00Z",
          days_remaining: 30,
        }],
      })],
    });
    getOrderMock
      .mockResolvedValueOnce(order())
      .mockResolvedValueOnce(updated);
    getDeliveryOptionsMock.mockResolvedValue({ items: [deliveryItem()] });
    assignAccountMock.mockResolvedValue({ delivery: delivery() });
    approveDeliveryMock.mockResolvedValue(updated);

    render(<AdminOrderDetail orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Setujui & kirim akun/ }));
    expect(await screen.findByText("Pilih akun untuk dikirim")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Akun Baru/ }));
    fireEvent.click(screen.getByRole("button", { name: /Simpan akun & kirim/ }));

    await waitFor(() => expect(assignAccountMock).toHaveBeenCalledWith(ORDER_ID, DELIVERY_ID, "acc-available"));
    expect(assignAccountMock.mock.invocationCallOrder[0]).toBeLessThan(approveDeliveryMock.mock.invocationCallOrder[0]);
    await waitFor(() => expect(approveDeliveryMock).toHaveBeenCalledWith(ORDER_ID));
    expect(await screen.findByText("Terkirim")).toBeInTheDocument();
    expect(screen.getByText(/1 dari 1 item terkirim/)).toBeInTheDocument();
    expect(screen.getByText("Sisa 30 hari")).toBeInTheDocument();
    expect(screen.queryByText(/username|password/i)).not.toBeInTheDocument();
  });

  it("menampilkan error 409 account_full apa adanya dengan panduan tindakan", async () => {
    getDeliveryOptionsMock.mockResolvedValue({ items: [deliveryItem()] });
    assignAccountMock.mockRejectedValue(new ApiError("Akun penuh", 409, { code: "account_full" }));

    render(<AdminOrderDetail orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Setujui & kirim akun/ }));
    fireEvent.click(await screen.findByRole("radio", { name: /Akun Baru/ }));
    fireEvent.click(screen.getByRole("button", { name: /Simpan akun & kirim/ }));

    expect(await screen.findByText(/Akun penuh \(account_full\)/)).toBeInTheDocument();
    expect(screen.getByText(/Pilih akun lain yang masih punya slot/)).toBeInTheDocument();
    expect(approveDeliveryMock).not.toHaveBeenCalled();
  });

  it("mengulang pengiriman yang gagal tanpa menampilkan kredensial", async () => {
    getOrderMock
      .mockResolvedValueOnce(order({
        status: "processing",
        deliveries: [delivery({ status: "failed", error_code: "email_failed" })],
      }))
      .mockResolvedValueOnce(order({
        status: "processing",
        deliveries: [delivery({ status: "sent", attempts: 2 })],
      }));
    retryDeliveryMock.mockResolvedValue({ delivery: delivery({ status: "sent", attempts: 2 }) });

    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Email gagal dikirim")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ulangi pengiriman Netflix Premium/ }));

    await waitFor(() => expect(retryDeliveryMock).toHaveBeenCalledWith(ORDER_ID, DELIVERY_ID));
    expect(await screen.findByText("Terkirim")).toBeInTheDocument();
    expect(screen.queryByText(/username|password/i)).not.toBeInTheDocument();
  });

  it("tidak menampilkan tombol ganti akun selama masa akses masih aktif", async () => {
    getOrderMock.mockResolvedValue(order({
      status: "processing",
      deliveries: [delivery({
        assigned_accounts: [{
          inventory_account_id: "acc-available",
          label: "Akun Baru",
          status: "active",
          activated_at: "2026-10-18T10:06:00Z",
          access_expires_at: "2099-12-31T23:59:59Z",
          days_remaining: 120,
        }],
      })],
    }));

    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Sisa 120 hari")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ganti akun/ })).not.toBeInTheDocument();
  });

  it("menampilkan tombol ganti akun hanya saat masa akses habis", async () => {
    getOrderMock.mockResolvedValue(order({
      status: "processing",
      deliveries: [delivery({
        assigned_accounts: [{
          inventory_account_id: "acc-old",
          label: "Akun Lama",
          status: "active",
          activated_at: "2026-09-01T10:06:00Z",
          access_expires_at: "2026-10-01T10:06:00Z",
          days_remaining: 0,
        }],
      })],
    }));

    render(<AdminOrderDetail orderId={ORDER_ID} />);

    expect(await screen.findByText("Masa akses habis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ganti akun/ })).toBeInTheDocument();
  });

  it("mengganti akun expired dengan payload benar dan menampilkan status email pengganti", async () => {
    const expiredOrder = order({
      status: "processing",
      deliveries: [delivery({
        assigned_accounts: [{
          inventory_account_id: "acc-old",
          label: "Akun Lama",
          status: "active",
          activated_at: "2026-09-01T10:06:00Z",
          access_expires_at: "2026-10-01T10:06:00Z",
          days_remaining: 0,
        }],
      })],
    });
    const replacedOrder = order({
      status: "processing",
      deliveries: [delivery({
        assigned_accounts: [{
          inventory_account_id: "acc-available",
          label: "Akun Baru",
          status: "active",
          activated_at: "2026-10-22T10:06:00Z",
          access_expires_at: "2026-11-21T10:06:00Z",
          days_remaining: 30,
        }],
        replacements: [{
          id: "replacement-1",
          order_id: ORDER_ID,
          order_item_id: "item-1",
          delivery_id: DELIVERY_ID,
          replacement_of: "slot-old",
          old_inventory_account_id: "acc-old",
          inventory_account_id: "acc-available",
          reason: "Akun lama expired",
          complaint_approved: false,
          status: "sent",
          attempts: 1,
          email_sent_at: "2026-10-22T10:06:00Z",
          created_at: "2026-10-22T10:06:00Z",
          updated_at: "2026-10-22T10:06:00Z",
        }],
      })],
    });
    getOrderMock
      .mockResolvedValueOnce(expiredOrder)
      .mockResolvedValueOnce(replacedOrder);
    getDeliveryOptionsMock.mockResolvedValue({
      items: [deliveryItem({
        assigned_account_ids: ["acc-old"],
        accounts: [
          account({
            inventory_account_id: "acc-old",
            label: "Akun Lama",
            assigned_to_item: true,
            can_assign: true,
          }),
          account(),
        ],
      })],
    });
    replaceAccountMock.mockResolvedValue({ delivery: (replacedOrder as unknown as { deliveries: unknown[] }).deliveries[0] });

    render(<AdminOrderDetail orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Ganti akun/ }));

    expect(await screen.findByText("Ganti akun Netflix Premium")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Akun Lama/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Akun Baru/ }));
    fireEvent.change(screen.getByLabelText(/Alasan penggantian/), { target: { value: "Akun lama expired" } });
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi ganti akun/ }));

    await waitFor(() => expect(replaceAccountMock).toHaveBeenCalledWith(
      ORDER_ID,
      DELIVERY_ID,
      "acc-available",
      "Akun lama expired",
      false,
    ));
    expect((await screen.findAllByText(/Email terkirim/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Riwayat penggantian akun")).toBeInTheDocument();
    expect(screen.getByText("Akun lama expired")).toBeInTheDocument();
    expect(screen.getByText("Akun acc-old")).toBeInTheDocument();
    expect(screen.queryByText(/username|password/i)).not.toBeInTheDocument();
  });

  it("menampilkan error account_not_expired saat penggantian ditolak", async () => {
    getOrderMock.mockResolvedValue(order({
      status: "processing",
      deliveries: [delivery({
        error_code: "complaint",
        assigned_accounts: [{
          inventory_account_id: "acc-old",
          label: "Akun Lama",
          status: "active",
          access_expires_at: "2099-12-31T23:59:59Z",
          days_remaining: 120,
        }],
      })],
    }));
    getDeliveryOptionsMock.mockResolvedValue({
      items: [deliveryItem({
        assigned_account_ids: ["acc-old"],
        accounts: [account()],
      })],
    });
    replaceAccountMock.mockRejectedValue(new ApiError("Akun belum expired", 409, { code: "account_not_expired" }));

    render(<AdminOrderDetail orderId={ORDER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Ganti akun/ }));
    fireEvent.click(await screen.findByRole("radio", { name: /Akun Baru/ }));
    fireEvent.change(screen.getByLabelText(/Alasan penggantian/), { target: { value: "Pembeli komplain" } });
    fireEvent.click(screen.getByRole("button", { name: /Konfirmasi ganti akun/ }));

    const dialog = screen.getByRole("dialog", { name: /Ganti akun Netflix Premium/ });
    expect(await within(dialog).findByText(/Masa akses lama masih aktif \(account_not_expired\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/centang komplain yang sudah disetujui/)).toBeInTheDocument();
  });
});
