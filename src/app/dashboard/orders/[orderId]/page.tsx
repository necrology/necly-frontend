import type { Metadata } from "next";
import { AdminOrderDetail } from "./admin-order-detail";

export const metadata: Metadata = { title: "Detail pesanan", robots: { index: false, follow: false } };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <AdminOrderDetail orderId={orderId} />;
}
