import type { Metadata, Viewport } from "next";
import "@fontsource/sora/400.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteDescription = "Solusi hemat berlangganan akun premium, aman dan terpercaya. Bandingkan harga, durasi, stok slot, dan aktivasi resmi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Necly Services — Langganan premium aman dan hemat", template: "%s | Necly Services" },
  description: siteDescription,
  applicationName: "Necly Services",
  keywords: ["langganan premium", "akun premium", "slot akun", "produk digital", "Indonesia"],
  authors: [{ name: "Necly Services" }],
  creator: "Necly Services",
  icons: { icon: "/brand/necly-services-logo-icon-only.svg", apple: "/brand/necly-services-logo.svg" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Necly Services",
    title: "Necly Services — Langganan premium aman dan hemat",
    description: siteDescription,
    images: [{ url: "/brand/necly-reference.jpg", width: 1920, height: 1080, alt: "Logo Necly Services" }],
  },
  twitter: { card: "summary_large_image", title: "Necly Services", description: siteDescription, images: ["/brand/necly-reference.jpg"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5420e8", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
        {children}
      </body>
    </html>
  );
}
