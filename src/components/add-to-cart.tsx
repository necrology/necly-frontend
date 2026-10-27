"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import type { SubscriptionProduct } from "@/lib/types";

export function AddToCart({ product }: { product: SubscriptionProduct }) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  // Stok dicatat per harga/durasi. Jangan mengambil paket pertama bila paket
  // itu habis sementara durasi lain masih tersedia.
  const firstPriceOption = product.priceOptions.find((option) => (option.stock ?? product.stock) > 0);
  const available = Boolean(firstPriceOption);

  const add = () => {
    if (!firstPriceOption) return;
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      categoryName: product.categoryName,
      price: firstPriceOption.price,
      stock: firstPriceOption.stock ?? product.stock,
      accessType: product.accessType,
      product_price_id: firstPriceOption.id,
      selectedDuration: firstPriceOption.duration,
      selectedPrice: firstPriceOption.price,
      selectedStock: firstPriceOption.stock ?? product.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <button className="button button-primary" style={{ width: "100%" }} type="button" disabled={!available} onClick={add}>
      {added ? <><Check size={15} /> Ditambahkan ke keranjang</> : <><ShoppingBag size={15} /> {available ? "Tambah ke keranjang" : "Stok habis"}</>}
    </button>
  );
}
