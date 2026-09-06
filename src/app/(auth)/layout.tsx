import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="auth-shell">
      <aside className="auth-story">
        <BrandLogo href="/" />
        <div style={{ maxWidth: 500, marginTop: 76 }}>
          <span className="eyebrow" style={{ color: "#68cbf5" }}>Langganan premium aman dan hemat</span>
          <h2 className="h1" style={{ color: "white", marginTop: 16 }}>Akses slot akun bersama tanpa repot.</h2>
          <p style={{ color: "#aebdce", marginTop: 22 }}>Necly menjual slot akun langganan premium yang bisa dipakai bersama. Pelanggan hemat biaya, aktivasi via undangan resmi, tanpa berbagi kata sandi.</p>
        </div>
      </aside>
      <section className="auth-form-wrap">{children}</section>
    </main>
  );
}
