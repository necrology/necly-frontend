import { createStore } from "zustand/vanilla";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  /** Nama kategori asli dari API; label keranjang memakai ini bila ada. */
  categoryName?: string;
  price: number;
  stock: number;
  accessType?: string;
  product_price_id?: string;
  selectedDuration?: string;
  selectedPrice?: number;
  selectedStock?: number;
  /** Jumlah perangkat yang dipilih pembeli di halaman detail produk (QA baris 38). */
  selectedDevice?: number;
};

export type CartItem = CartProduct & { quantity: number };

type CartState = {
  items: CartItem[];
  addItem: (item: CartProduct) => void;
  replaceItems: (items: CartItem[]) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  itemCount: () => number;
};

function getItemKey(item: CartProduct): string {
  return item.product_price_id ?? item.id;
}

const initializer = (set: (partial: Partial<CartState> | ((state: CartState) => Partial<CartState>)) => void, get: () => CartState): CartState => ({
  items: [],
  addItem: (item) => set((state) => {
    const existing = state.items.find((entry) => entry.id === item.id);
    if (existing) {
      let selectionReplaced = false;
      return {
        items: state.items.flatMap((entry) => {
          if (entry.id !== item.id) return [entry];
          if (selectionReplaced) return [];
          selectionReplaced = true;
          return [{ ...item, quantity: 1 }];
        }),
      };
    }
    return { items: [...state.items, { ...item, quantity: 1 }] };
  }),
  replaceItems: (items) => set({ items }),
  setQuantity: (id, quantity) => set((state) => {
    const entry = state.items.find((e) => getItemKey(e) === id);
    const stock = entry?.selectedStock ?? entry?.stock ?? 1;
    return {
      items: state.items.map((entry) =>
        getItemKey(entry) === id
          ? { ...entry, quantity: Math.max(1, Math.min(quantity, stock)) }
          : entry,
      ),
    };
  }),
  removeItem: (id) => set((state) => ({ items: state.items.filter((entry) => getItemKey(entry) !== id) })),
  clear: () => set({ items: [] }),
  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
});

export const createCartStore = () => createStore<CartState>()(initializer);

export const useCartStore = create<CartState>()(
  persist(initializer, {
    name: "necly-cart",
    partialize: (state) => ({ items: state.items }),
  }),
);
