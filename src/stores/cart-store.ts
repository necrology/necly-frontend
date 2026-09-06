import { createStore } from "zustand/vanilla";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  accessType?: string;
  product_price_id?: string;
  selectedDuration?: string;
  selectedPrice?: number;
  selectedStock?: number;
};

export type CartItem = CartProduct & { quantity: number };

type CartState = {
  items: CartItem[];
  addItem: (item: CartProduct) => void;
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
    const key = getItemKey(item);
    const existing = state.items.find((entry) => getItemKey(entry) === key);
    const stock = item.selectedStock ?? item.stock;
    if (existing) {
      return {
        items: state.items.map((entry) =>
          getItemKey(entry) === key
            ? { ...entry, quantity: Math.min(entry.quantity + 1, stock) }
            : entry,
        ),
      };
    }
    return { items: [...state.items, { ...item, quantity: 1 }] };
  }),
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