"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import type { SubscriptionProduct } from "@/lib/types";

export function AddToCart({ product }: { product: SubscriptionProduct }) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const available = product.stock > 0 && product.priceOptions.length > 0;
  const firstPriceOption = product.priceOptions[0];

  const add = () => {
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: firstPriceOption?.price ?? product.price,
      stock: firstPriceOption?.stock ?? product.stock,
      accessType: product.accessType,
      product_price_id: firstPriceOption?.id,
      selectedDuration: firstPriceOption?.duration,
      selectedPrice: firstPriceOption?.price,
      selectedStock: firstPriceOption?.stock,
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