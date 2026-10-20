import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listOrdersMock, bootstrapAuthMock } = vi.hoisted(() => ({
  listOrdersMock: vi.fn(),
  bootstrapAuthMock: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    DEMO_MODE: false,
    bootstrapAuth: bootstrapAuthMock,
    adminApi: { ...actual.adminApi, listOrders: listOrdersMock },
  };
});

import OrdersAdminPage from "./page";
import { ORDER_STATUS_OPTIONS } from "@/lib/order-status";

const BACKEND_STATUSES = [
  "pending_payment",
  "paid",
  "fulfilling",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
] as const;

function order(status: string, index: number) {
  return {
    id: `0192f0b0-0000-0000-0000-${String(index).padStart(12, "0")}`,
    number: `ORD-W8-${index}`,
    status,
    subtotal: 186000,
    discount: 0,
    total: 186000,
    currency: "IDR",
    payment_due_at: "2026-10-18T10:15:00Z",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:00:00Z",
    customer: { id: `cust-${index}`, name: `Customer ${index}`, email: `customer${index}@example.test` },
    items: [{
      id: `item-${index}`,
      product_price_id: "0192f0a4-0000-0000-0000-000000000001",
      product_name: "Netflix Premium",
      duration_name: "1 Bulan",
      unit_price: 186000,
      quantity: 1,
      device_count: 1,
      line_total: 186000,
    }],
  };
}

describe("daftar pesanan admin — seluruh status backend", () => {
  beforeEach(() => {
    listOrdersMock.mockReset();
    bootstrapAuthMock.mockReset();
    bootstrapAuthMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    listOrdersMock.mockResolvedValue({
      orders: BACKEND_STATUSES.map(order),
      page: 1,
      per_page: 50,
      total: BACKEND_STATUSES.length,
    });
  });

  it("menampilkan 10 pesanan tanpa label Status lainnya dan menyediakan semua filter", async () => {
    render(<OrdersAdminPage />);

    await waitFor(() => expect(screen.getByText("ORD-W8-0")).toBeInTheDocument());
    expect(screen.queryByText("Status lainnya")).not.toBeInTheDocument();

    const filter = screen.getAllByRole("combobox")[0];
    const optionLabels = Array.from(filter.querySelectorAll("option")).map((option) => option.textContent);
    for (const label of ORDER_STATUS_OPTIONS) {
      expect(optionLabels).toContain(label);
    }
    expect(optionLabels).not.toContain("Aktif");
    expect(listOrdersMock).toHaveBeenCalledWith({ page: 1, per_page: 50 });
  });
});
