"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductVariant, CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
  ) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variant, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.variant.id === variant.id);

        if (existing) {
          set({
            items: items.map((i) =>
              i.variant.id === variant.id
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            ),
          });
        } else {
          const primaryImage = product.images?.find((img) => img.is_primary);
          const firstImage = product.images?.[0];
          set({
            items: [
              ...items,
              {
                product,
                variant,
                quantity,
                image_url: primaryImage?.url || firstImage?.url || null,
              },
            ],
          });
        }
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter((i) => i.variant.id !== variantId) });
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.variant.id === variantId ? { ...i, quantity } : i,
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => {
          const price = i.variant.discount_price ?? i.variant.sale_price;
          return sum + price * i.quantity;
        }, 0),
    }),
    { name: "evolution-gadget-cart" },
  ),
);
