"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { formatIDR } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";
import type { SubscriptionProduct } from "@/lib/types";

export function ProductOrderPanel({ product }: { product: SubscriptionProduct }) {
  const [selected, setSelected] = useState(0);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const option = product.priceOptions[selected] ?? product.priceOptions[0];
  const available = product.stock > 0 && Boolean(option);
  const add = () => {
    if (!option) return;
    addItem({ id: product.id, slug: product.slug, name: product.name, category: product.category, price: option.price, stock: option.stock ?? product.stock, accessType: product.accessType, product_price_id: option.id, selectedDuration: option.duration, selectedPrice: option.price, selectedStock: option.stock ?? product.stock });
    setAdded(true); window.setTimeout(() => setAdded(false), 1800);
  };
  return <aside className="product-order-panel"><div className="product-order-visual"><span>{product.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span></div><div className="product-order-copy"><span className="catalog-category">{product.category}</span><h1>{product.name}</h1><p>{product.summary}</p><div className="product-order-price">{formatIDR(option?.price ?? product.price)} <small>/ bulan</small></div><span className="product-stock">{product.stock > 0 ? "Stok tersedia, langsung bisa diproses!" : "Saat ini masuk daftar tunggu"}</span><h2>Pilih Durasi</h2><div className="duration-options">{product.priceOptions.map((item, index) => <button type="button" className={selected === index ? "selected" : ""} onClick={() => setSelected(index)} key={item.id}><strong>{item.label}</strong><small>{formatIDR(item.price)}</small></button>)}</div></div><div className="product-order-summary"><h2>Ringkasan Pesanan</h2><div><span>Paket dipilih</span><strong>{product.name}</strong></div><div><span>Durasi berlangganan</span><strong>{option?.label}</strong></div><div className="product-order-total"><span>Total Biaya</span><strong>{formatIDR(option?.price ?? product.price)}</strong></div><button className="button button-primary" type="button" disabled={!available} onClick={add}>{added ? <><Check size={16} /> Ditambahkan</> : <><ShoppingBag size={16} /> Pesan</>}</button></div></aside>;
}
