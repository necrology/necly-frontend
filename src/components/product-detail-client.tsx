"use client";

import { CheckCircle2, ChevronDown, CircleAlert, Clock3, Flame, Gift, Info, ShieldCheck, Star, UsersRound, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type CommerceProduct } from "@/data/products";
import { formatRupiahLabel } from "@/lib/money";
import { ProductBrand } from "@/components/product-brand";
import { ProductPhoto } from "@/components/product-photo";
import { productIllustration } from "@/components/service-visual";
import { useCartStore } from "@/stores/cart-store";

const accordions = [
  { title: "Informasi", icon: Info },
  { title: "Manfaat Layanan", icon: Gift },
  { title: "Skema Berlangganan", icon: UsersRound },
  { title: "Skema Harga", icon: null },
] as const;

// Baris 37: isi card "Manfaat Layanan" memakai copy persis dari dokumen QA.
const serviceBenefitsCopy = "Dengan berlangganan di Necly Service, kamu bisa menikmati harga lebih hemat, privasi yang terjaga, layanan yang responsif, akses yang terpercaya, berbagai pilihan pembayaran, serta pengingat pembayaran agar tidak terlewat";

// Baris 36: isi card "Informasi" memakai copy dari dokumen QA. Jumlah perangkat
// mengikuti pilihan pembeli supaya informasinya benar-benar sesuai pesanan.
const deviceList = "Smartphone, Laptop/PC, Smart TV";

const purchaseReasons = [
  ["Akses Legal dan Terpercaya", "Semua layanan kami sudah melalui proses yang aman dan terpercaya.", ShieldCheck],
  ["Harga Lebih Hemat", "Nikmati layanan premium dengan sistem patungan yang aman.", UsersRound],
  ["Proses Cepat", "Akun langsung diproses setelah pembayaran dikonfirmasi.", Zap],
  ["Tim Support Siap Membantu", "Ada kendala? Tim kami siap membantu Anda kapan saja.", Gift],
] as const;

export function ProductDetailClient({ product }: { product: CommerceProduct }) {
  const router = useRouter();
  // Durasi dan paket dipilih eksplisit supaya pembeli meninjau paket sebelum
  // checkout. Jumlah perangkat tidak lagi diatur di halaman detail; checkout
  // memakai ketentuan perangkat dari paket yang dipilih.
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>("Skema Harga");
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const packageSectionRef = useRef<HTMLHeadingElement>(null);
  const durationSectionRef = useRef<HTMLHeadingElement>(null);
  const durationRowRef = useRef<HTMLDivElement>(null);

  // Pemilih durasi letaknya inline di halaman, bukan accordion. Tombol "Ubah"
  // karena itu mengantar user ke sana, bukan membuka accordion lain.
  // `scrollIntoView` dipanggil opsional karena belum ada di semua environment.
  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => ref.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });

  const editDuration = () => {
    scrollTo(durationSectionRef);
    durationRowRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  };

  // Produk yang baru dibuat admin bisa belum punya baris harga sama sekali.
  // Tanpa penjagaan ini `option` undefined dan halaman detail crash saat
  // membaca `option.stock`, padahal produk tetap tampil di katalog.
  if (product.priceOptions.length === 0) {
    return (
      <div className="commerce-product-detail-shell">
        <div className="commerce-product-detail-main">
          <div className="commerce-empty-state" role="status">
            <h1>{product.name}</h1>
            <p>Paket harga untuk produk ini belum tersedia. Silakan kembali lagi nanti.</p>
            <Link className="commerce-detail-backlink" href="/products">Lihat produk lain</Link>
          </div>
        </div>
      </div>
    );
  }

  const option = selectedDuration === null ? product.priceOptions[0] : (product.priceOptions[selectedDuration] ?? product.priceOptions[0]);
  const estimated = selectedPackage && selectedDuration !== null;
  const comingSoon = product.comingSoon === true;
  // Stok yang berlaku adalah milik paket yang sedang dipilih: backend memeriksa
  // slot per product_price, bukan per produk.
  const inStock = (option.stock ?? product.stock) > 0;
  const packageMissing = showWarnings && !selectedPackage;
  const durationMissing = showWarnings && selectedDuration === null;
  const stockMissing = showWarnings && selectedDuration !== null && !inStock;
  // Rincian harga dari admin dipakai bila ada. Produk lama yang belum punya
  // base_amount/admin_fee tetap memakai angka katalog supaya tidak menampilkan
  // "Harga Provider Rp0".
  const hasBreakdown = (option.baseAmount ?? 0) > 0 || (option.adminFee ?? 0) > 0;
  const baseAmount = hasBreakdown ? option.baseAmount ?? 0 : product.providerPrice;
  const adminFee = hasBreakdown ? option.adminFee ?? 0 : 0;
  const memberSlots = hasBreakdown ? option.memberSlots ?? product.groupMembers : product.groupMembers;
  const adminIncluded = hasBreakdown ? option.adminIncluded ?? false : false;
  const priceDivisor = Math.max(1, memberSlots + (adminIncluded ? 1 : 0));
  const totalCost = baseAmount + adminFee;
  const perMemberAmount = totalCost > 0
    ? Math.ceil(totalCost / priceDivisor / 1000) * 1000
    : option.price;
  const perMember = formatRupiahLabel(perMemberAmount);
  const priceRows: Array<[string, string]> = [
    ["Nama Paket", product.packageName],
    ["Harga Provider", formatRupiahLabel(baseAmount)],
    ["Jumlah Member Per Grup", `${memberSlots} orang${adminIncluded ? " + admin" : ""}`],
    ["Harga Patungan", `${formatRupiahLabel(totalCost)} ÷ ${priceDivisor} = ${perMember}`],
    ["Biaya Admin Akunmu", formatRupiahLabel(adminFee)],
    [product.discount > 0 ? "Diskon 8%" : "Diskon", formatRupiahLabel(product.discount)],
    ["Harga Paket", formatRupiahLabel(option.price)],
  ];

  const addToCart = () => {
    // Coming Soon bukan stok habis: tombol dan seluruh pemilih dinonaktifkan,
    // dan halaman ini tidak boleh pernah mendorong item ke keranjang.
    if (comingSoon) return;
    if (!selectedPackage || selectedDuration === null) {
      setShowWarnings(true);
      scrollTo(!selectedPackage ? packageSectionRef : durationRowRef);
      return;
    }
    if (!inStock) {
      setShowWarnings(true);
      scrollTo(durationRowRef);
      return;
    }
    const duration = product.priceOptions[selectedDuration] ?? product.priceOptions[0];
    // Stok dicatat per harga: backend memeriksa slot milik product_price yang
    // dipesan (checkout.go). Memakai stok tingkat produk membuat keranjang
    // mengizinkan jumlah yang lebih besar daripada slot paket yang dipilih.
    const durationStock = duration.stock ?? product.stock;
    addItem({ id: product.id, slug: product.slug, name: product.name, category: product.category, price: duration.price, stock: durationStock, accessType: product.accessType, product_price_id: duration.id, selectedDuration: duration.label, selectedPrice: duration.price, selectedStock: durationStock });
    setAdded(true);
    router.push("/checkout");
  };

  return (
    <div className={`commerce-product-detail-shell ${comingSoon ? "is-coming-soon" : ""}`}>
      <div className="commerce-product-detail-main">
        <div className="commerce-product-showcase">
          {/* Baris 33: logo brand hanya dicantumkan sekali. Overlay di atas artwork
              dihapus karena logo yang sama sudah tampil di kolom informasi. */}
          <div className="commerce-product-image">
            <ProductPhoto src={product.imageUrl} alt={`Foto produk ${product.name}`} fallbackSrc={productIllustration(product.category)} loading="eager" />
          </div>
          <div className="commerce-product-information">
            <div className="commerce-product-labels">
              {comingSoon ? (
                <span className="is-coming-soon"><Clock3 size={12} strokeWidth={2.5} aria-hidden="true" />Coming Soon</span>
              ) : (
                <><span><Flame size={12} strokeWidth={2.5} aria-hidden="true" />Paling Populer</span><span><Star size={12} strokeWidth={2.5} aria-hidden="true" />Rekomendasi</span></>
              )}
            </div>
            <ProductBrand product={product} />
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <p className="commerce-detail-price">{formatRupiahLabel(option.price)} <small>/ bulan</small></p>
            {comingSoon ? (
              <p className="commerce-coming-soon-banner" role="status"><Clock3 size={18} />Produk ini segera hadir. Pemesanan dibuka setelah tanggal rilis.</p>
            ) : (
              <p className={`commerce-stock-ready ${inStock ? "" : "is-empty"}`}>{inStock ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}{inStock ? "Stok tersedia, langsung bisa diproses!" : "Stok habis, saat ini masuk daftar tunggu"}</p>
            )}
            <h2 ref={packageSectionRef}>Pilih Paket <span className="commerce-required" aria-hidden="true">*</span></h2>
            <button type="button" className={`commerce-package-option ${selectedPackage ? "selected" : ""}`} aria-pressed={selectedPackage} disabled={comingSoon} onClick={() => setSelectedPackage(true)}><span className="commerce-radio" /><span><strong>{product.packageName}</strong><small>{product.brand}</small></span><b>{formatRupiahLabel(option.price)} <small>/ bulan</small></b></button>
            {packageMissing && <p className="commerce-field-warning" role="alert"><CircleAlert size={15} />Pilih paket dahulu sebelum memesan.</p>}
            <h2 ref={durationSectionRef}>Pilih Durasi Berlangganan <span className="commerce-required" aria-hidden="true">*</span></h2>
            <div className="commerce-duration-row" ref={durationRowRef}>{product.priceOptions.map((duration, index) => { const hasStock = (duration.stock ?? product.stock) > 0; return <button type="button" className={index === selectedDuration ? "selected" : ""} aria-pressed={index === selectedDuration} disabled={comingSoon || !hasStock} onClick={() => setSelectedDuration(index)} key={duration.id}>{duration.label}{hasStock ? "" : " · Habis"}</button>; })}</div>
            {durationMissing && <p className="commerce-field-warning" role="alert"><CircleAlert size={15} />Pilih durasi berlangganan dahulu sebelum memesan.</p>}
            {stockMissing && <p className="commerce-field-warning" role="alert"><CircleAlert size={15} />Durasi ini sedang habis. Pilih durasi lain yang masih tersedia.</p>}
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
                  ) : title === "Informasi" ? (
                    <div className="commerce-accordion-copy">
                      <ol>
                        <li>Jumlah perangkat yang dapat digunakan mengikuti <strong>ketentuan paket yang Anda pilih</strong>.</li>
                        <li>Perangkat yang dapat digunakan meliputi <strong>{deviceList}</strong>, dan perangkat lainnya yang mendukung layanan.</li>
                        <li>Akses layanan akan <strong>otomatis berakhir 1 bulan setelah tanggal CO (checkout)</strong>. Jadi, jangan lupa cek masa aktif layanan secara berkala agar kamu bisa mengantisipasi perpanjangan dari jauh hari.</li>
                      </ol>
                      {/* Baris 36: paragraf ini disejajarkan dengan butir daftar di atasnya,
                          diberi tanda bintang di awal, dan memakai warna merah. */}
                      <p className="commerce-accordion-note"><span aria-hidden="true">*</span>Jika mengalami kendala, kamu dapat menghubungi <strong>kontak yang tertera</strong> atau menggunakan fitur <strong>&ldquo;Laporan Kendala&rdquo;</strong> melalui menu titik tiga di sebelah kiri pada halaman beranda.</p>
                    </div>
                  ) : (
                    <p>{title === "Manfaat Layanan" ? serviceBenefitsCopy : "Pilih paket yang Anda inginkan, selesaikan pembayaran, lalu tim kami akan memproses akses layanan Anda."}</p>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      <aside className="commerce-order-summary">
        <h2>Ringkasan Pesanan</h2>
        <div className="commerce-summary-product commerce-summary-product--text"><div><strong>{product.name} - {product.packageName}</strong><b>{estimated ? <>{formatRupiahLabel(option.price)} <small>/ bulan</small></> : "—"}</b></div></div>
        <div className="commerce-summary-line"><span>Paket Dipilih</span><strong>{product.packageName}</strong><small>{product.brand}</small></div>
        <div className="commerce-summary-line"><span>Durasi Berlangganan <button type="button" onClick={editDuration} disabled={comingSoon}>Ubah</button></span><strong>{selectedDuration !== null ? option.label : "Belum dipilih"}</strong></div>
        <div className="commerce-summary-total"><span>Total Biaya</span><b>{estimated ? formatRupiahLabel(option.price) : "—"}</b></div>
        <button className="commerce-primary-button" type="button" disabled={comingSoon || (selectedDuration !== null && !inStock)} onClick={addToCart}>{comingSoon ? "Segera hadir" : added ? "Lanjut ke checkout…" : selectedDuration !== null && !inStock ? "Stok habis" : <>Pesan <span>→</span></>}</button>
      </aside>
      <aside className="commerce-buy-reasons"><h2>Kenapa Beli di Sini?</h2>{purchaseReasons.map(([title, detail, Icon]) => <article key={title}><span><Icon size={25} /></span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</aside>
      <div className="commerce-mobile-order-bar"><span><small>Total Biaya</small><b>{estimated ? formatRupiahLabel(option.price) : "Lengkapi pilihan"}</b></span><button type="button" disabled={comingSoon || (selectedDuration !== null && !inStock)} onClick={addToCart}>{comingSoon ? "Segera hadir" : added ? "Memproses…" : selectedDuration !== null && !inStock ? "Stok habis" : "Pesan"}</button></div>
      <Link className="commerce-detail-backlink" href="/products">Kembali ke Produk</Link>
    </div>
  );
}
