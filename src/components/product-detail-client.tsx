"use client";

import { CheckCircle2, ChevronDown, Gift, Info, ShieldCheck, UsersRound, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CommerceProduct } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { ProductBrand } from "@/components/product-brand";
import { useCartStore } from "@/stores/cart-store";

const accordions = [
  { title: "Informasi", icon: Info },
  { title: "Manfaat Layanan", icon: Gift },
  { title: "Skema Berlangganan", icon: UsersRound },
  { title: "Skema Harga", icon: null },
] as const;

const purchaseReasons = [
  ["Akses Legal dan Terpercaya", "Semua layanan kami sudah melalui proses yang aman dan terpercaya.", ShieldCheck],
  ["Harga Lebih Hemat", "Nikmati layanan premium dengan sistem patungan yang aman.", UsersRound],
  ["Proses Cepat", "Akun langsung diproses setelah pembayaran dikonfirmasi.", Zap],
  ["Tim Support Siap Membantu", "Ada kendala? Tim kami siap membantu Anda kapan saja.", Gift],
] as const;

export function ProductDetailClient({ product }: { product: CommerceProduct }) {
  const router = useRouter();
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [openAccordion, setOpenAccordion] = useState<string>("Skema Harga");
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const option = product.priceOptions[selectedDuration] ?? product.priceOptions[0];
  const perMember = formatRupiahLabel(Math.round(product.providerPrice / product.groupMembers));
  const priceRows: Array<[string, string]> = [
    ["Nama Paket", product.packageName],
    ["Harga Provider", formatRupiahLabel(product.providerPrice)],
    ["Jumlah Member Per Grup", `${product.groupMembers} orang`],
    ["Harga Patungan", `${formatRupiahLabel(product.providerPrice)} ÷ ${product.groupMembers} = ${perMember}`],
    ["Biaya Admin Akunmu", "Rp 0"],
    ["Diskon 8%", formatRupiahLabel(product.discount)],
    ["Harga Paket", formatRupiahLabel(option.price)],
  ];

  const addToCart = () => {
    addItem({ id: product.id, slug: product.slug, name: product.name, category: product.category, price: option.price, stock: product.stock, accessType: product.accessType, product_price_id: option.id, selectedDuration: option.label, selectedPrice: option.price, selectedStock: product.stock });
    setAdded(true);
    router.push("/checkout");
  };

  return (
    <div className="commerce-product-detail-shell">
      <div className="commerce-product-detail-main">
        <div className="commerce-product-showcase">
          <div className="commerce-product-image">
            <Image src="/illustrations/product-streaming.svg" alt={`Ilustrasi ${product.name}`} fill priority sizes="(max-width: 767px) 100vw, 38vw" />
          </div>
          <div className="commerce-product-information">
            <div className="commerce-product-labels"><span>Paling Populer</span><span>Rekomendasi</span></div>
            <ProductBrand product={product} />
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <p className="commerce-detail-price">{formatRupiahLabel(option.price)} <small>/ bulan</small></p>
            <p className="commerce-stock-ready"><CheckCircle2 size={18} />{product.stock > 0 ? "Stok tersedia, langsung bisa diproses!" : "Saat ini masuk daftar tunggu"}</p>
            <h2>Pilih Paket</h2>
            <button type="button" className="commerce-package-option selected" aria-pressed="true"><span className="commerce-radio" /><span><strong>{product.packageName}</strong><small>{product.brand}</small></span><b>{formatRupiahLabel(option.price)} <small>/ bulan</small></b></button>
            <h2>Pilih Durasi Berlangganan</h2>
            <div className="commerce-duration-row">{product.priceOptions.map((duration, index) => <button type="button" className={index === selectedDuration ? "selected" : ""} aria-pressed={index === selectedDuration} onClick={() => setSelectedDuration(index)} key={duration.id}>{duration.label}</button>)}</div>
          </div>
        </div>
        <div className="commerce-detail-accordions">
          {accordions.map(({ title, icon: Icon }) => (
            <section className={`commerce-detail-accordion ${openAccordion === title ? "open" : ""}`} key={title}>
              <button type="button" aria-expanded={openAccordion === title} onClick={() => setOpenAccordion(openAccordion === title ? "" : title)}>
                <span>{Icon ? <Icon size={23} /> : <span className="commerce-money-symbol">$</span>}</span>
                {title}
                <ChevronDown size={20} />
              </button>
              {openAccordion === title && (
                <div className="commerce-accordion-content">
                  {title === "Skema Harga" ? (
                    <div className="commerce-price-scheme">{priceRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
                  ) : (
                    <p>{title === "Informasi" ? product.summary : title === "Manfaat Layanan" ? product.benefits.join(" · ") : "Pilih paket yang Anda inginkan, selesaikan pembayaran, lalu tim kami akan memproses akses layanan Anda."}</p>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      <aside className="commerce-order-summary">
        <h2>Ringkasan Pesanan</h2>
        <div className="commerce-summary-product"><div><ProductBrand product={product} compact /></div><div><strong>{product.name} - {product.packageName}</strong><b>{formatRupiahLabel(option.price)} <small>/ bulan</small></b></div></div>
        <div className="commerce-summary-line"><span>Paket Dipilih</span><strong>{product.packageName}</strong><small>{product.brand}</small></div>
        <div className="commerce-summary-line"><span>Durasi Berlangganan <button type="button" onClick={() => setOpenAccordion("Skema Harga")}>Ubah</button></span><strong>{option.label}</strong></div>
        <div className="commerce-summary-total"><span>Total Biaya</span><b>{formatRupiahLabel(option.price)}</b></div>
        <button className="commerce-primary-button" type="button" onClick={addToCart}>{added ? "Lanjut ke checkout…" : <>Pesan <span>→</span></>}</button>
      </aside>
      <aside className="commerce-buy-reasons"><h2>Kenapa Beli di Sini?</h2>{purchaseReasons.map(([title, detail, Icon]) => <article key={title}><span><Icon size={25} /></span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</aside>
      <div className="commerce-mobile-order-bar"><span><small>Total Biaya</small><b>{formatRupiahLabel(option.price)}</b></span><button type="button" onClick={addToCart}>{added ? "Memproses…" : "Pesan"}</button></div>
      <Link className="commerce-detail-backlink" href="/products">Kembali ke Produk</Link>
    </div>
  );
}
