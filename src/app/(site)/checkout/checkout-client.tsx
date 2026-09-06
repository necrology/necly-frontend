"use client";

import { AlertCircle, ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { cartTotals, formatIDR } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";
import { checkoutApi, bootstrapAuth, useAuthStore, DEMO_MODE, type CheckoutResponse } from "@/lib/api";
import { randomUUID } from "crypto";

function generateIdempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutClient() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const items = useCartStore((state) => state.items);
  const totals = cartTotals(items);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const brief = String(data.get("brief") ?? "").trim();
    if (name.length < 2) nextErrors.name = "Masukkan nama lengkap pemesan.";
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Masukkan alamat email yang valid.";
    if (brief.length > 0 && brief.length < 10) nextErrors.brief = "Catatan minimal 10 karakter jika diisi.";
    if (!data.get("terms")) nextErrors.terms = "Setujui syarat dan ketentuan sebelum melanjutkan.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      if (DEMO_MODE) {
        router.push("/payment/NCL-DEMO-260906");
        return;
      }

      const user = useAuthStore.getState().user ?? (await bootstrapAuth());
      if (!user) {
        router.push(`/login?redirect=/checkout`);
        return;
      }

      const response = await checkoutApi.checkout(
        {
          voucher_code: String(data.get("voucher") ?? "") || undefined,
          items: items.map((item) => ({ product_price_id: item.product_price_id ?? item.id, quantity: item.quantity })),
        },
        generateIdempotencyKey(),
      );

      router.push(`/payment/${response.order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout gagal. Coba lagi.";
      setErrors({ submit: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) return <div className="skeleton" style={{ height: 320, borderRadius: 7 }} />;
  if (!items.length) return <div className="empty-state"><AlertCircle size={28} /><h2 className="h3">Keranjang belanja kosong</h2><p className="muted">Tambahkan slot langganan ke keranjang sebelum melanjutkan ke penyelesaian pesanan.</p><Link className="button button-primary" href="/products">Jelajahi produk</Link></div>;

  return (
    <div className="commerce-layout">
      <form className="card form-card" onSubmit={submit} noValidate>
        {DEMO_MODE && (
          <div className="demo-banner">
            <LockKeyhole size={16} />
            <span>
              <strong>Mode demo.</strong> Pesanan disimulasikan dan tidak memproses pembayaran nyata.
            </span>
          </div>
        )}
        <section className="form-section">
          <h2>Data pemesan</h2>
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="name">Nama lengkap</label><input className="input" id="name" name="name" autoComplete="name" placeholder="Nabila Rahma" aria-invalid={Boolean(errors.name)} />{errors.name && <span className="field-error" role="alert">{errors.name}</span>}</div>
            <div className="field"><label className="label" htmlFor="email">Alamat email</label><input className="input" id="email" name="email" type="email" autoComplete="email" placeholder="nabila@contoh.id" aria-invalid={Boolean(errors.email)} />{errors.email && <span className="field-error" role="alert">{errors.email}</span>}</div>
            <div className="field"><label className="label" htmlFor="phone">Nomor WhatsApp / Telepon <span className="muted">(opsional)</span></label><input className="input" id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+62 812 3456 7890" /></div>
          </div>
        </section>
        <section className="form-section">
          <h2>Catatan pesanan</h2>
          <div className="field">
            <label className="label" htmlFor="brief">Catatan untuk tim aktivasi <span className="muted">(opsional)</span></label>
            <textarea className="textarea" id="brief" name="brief" placeholder="Tambahkan catatan khusus, misalnya email akun yang ingin diundang…" aria-invalid={Boolean(errors.brief)} />
            {errors.brief && <span className="field-error" role="alert">{errors.brief}</span>}
            <span className="muted small">Jangan pernah mengirim kata sandi atau kredensial rahasia apa pun.</span>
          </div>
        </section>
        <section className="form-section">
          <label className="check-row">
            <input name="terms" type="checkbox" />
            <span>Saya menyetujui syarat & ketentuan Necly serta memahami bahwa akses diberikan melalui undangan resmi atau kursi berlisensi.</span>
          </label>
          {errors.terms && <span className="field-error" role="alert" style={{ display: "block", marginTop: 8 }}>{errors.terms}</span>}
          {errors.submit && <div className="demo-banner" style={{ marginTop: 12, borderColor: "var(--danger)", background: "var(--danger-bg)", color: "var(--danger)" }}>{errors.submit}</div>}
          <button className="button button-primary" style={{ width: "100%", marginTop: 22 }} type="submit" disabled={submitting}>
            {submitting ? "Memproses pesanan…" : <>Lanjutkan ke pembayaran <ArrowRight size={15} /></>}
          </button>
        </section>
      </form>
      <aside className="card summary-card">
        <h2 className="h3">Ringkasan pesanan</h2>
        <div style={{ display: "grid", gap: 13, marginTop: 18 }}>{items.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 11 }}><span>{item.name} × {item.quantity}</span><strong className="tabular">{formatIDR(item.price * item.quantity)}</strong></div>)}</div>
        <div className="summary-lines"><div className="summary-line"><span>Subtotal</span><span>{formatIDR(totals.subtotal)}</span></div><div className="summary-line"><span>Biaya layanan</span><span>{formatIDR(totals.serviceFee)}</span></div><div className="summary-line summary-total"><span>Total tagihan</span><span>{formatIDR(totals.total)}</span></div></div>
        <p className="muted" style={{ margin: 0, fontSize: 9 }}>Slot akun akan dialokasikan setelah pembayaran dikonfirmasi.</p>
      </aside>
    </div>
  );
}