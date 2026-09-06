import type { Metadata } from "next";
import { PaymentClient } from "./payment-client";

export const metadata: Metadata = { title: "Sandbox payment", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <div className="payment-wrap"><header className="payment-head"><span className="badge status-info">Step 2 of 2 · Sandbox</span><h1 className="h1" style={{ fontSize: 38 }}>Payment simulation</h1><p className="lede" style={{ fontSize: 13 }}>Preview the final checkout state without sending funds or personal payment data.</p></header><PaymentClient orderId={orderId} /></div>;
}
