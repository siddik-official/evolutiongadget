"use client";

import { create } from "zustand";
import type { POSSaleItem } from "@/types";

interface Customization {
  name: string;
  number: string;
}

interface POSState {
  items: POSSaleItem[];
  customerName: string;
  customerPhone: string;
  paymentMethod: "cash" | "online";
  onlinePaymentDetails: string; // e.g., "bKash", "Nagad", "Bank Transfer"
  // Customization: key = variantId, value = array of {name, number} per unit
  customizations: Record<string, Customization[]>;
  // Item discounts: key = variantId
  itemDiscounts: Record<string, number>; // discount on unit_price
  customizationDiscounts: Record<string, number>; // discount on customization price per unit

  addItem: (item: POSSaleItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setPaymentMethod: (method: "cash" | "online") => void;
  setOnlinePaymentDetails: (details: string) => void;
  setCustomization: (
    variantId: string,
    unitIdx: number,
    field: "name" | "number",
    value: string,
  ) => void;
  setItemDiscount: (variantId: string, discount: number) => void;
  setCustomizationDiscount: (variantId: string, discount: number) => void;
  clearSale: () => void;
  totalItems: () => number;
  subtotal: (customizationPrice: number) => number;
  getCustomizationCount: () => number;
  getTotalDiscount: (customizationPrice: number) => number;
}

export const usePOSStore = create<POSState>()((set, get) => ({
  items: [],
  customerName: "",
  customerPhone: "",
  paymentMethod: "cash",
  onlinePaymentDetails: "",
  customizations: {},
  itemDiscounts: {},
  customizationDiscounts: {},

  addItem: (item) => {
    const items = get().items;
    const existing = items.find((i) => i.variant_id === item.variant_id);

    if (existing) {
      set({
        items: items.map((i) =>
          i.variant_id === item.variant_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        ),
      });
    } else {
      set({ items: [...items, item] });
    }
  },

  removeItem: (variantId) => {
    const { customizations, itemDiscounts, customizationDiscounts } = get();
    const newCustomizations = { ...customizations };
    const newItemDiscounts = { ...itemDiscounts };
    const newCustomizationDiscounts = { ...customizationDiscounts };

    delete newCustomizations[variantId];
    delete newItemDiscounts[variantId];
    delete newCustomizationDiscounts[variantId];

    set({
      items: get().items.filter((i) => i.variant_id !== variantId),
      customizations: newCustomizations,
      itemDiscounts: newItemDiscounts,
      customizationDiscounts: newCustomizationDiscounts,
    });
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.variant_id === variantId ? { ...i, quantity } : i,
      ),
    });
  },

  setCustomerName: (name) => set({ customerName: name }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setPaymentMethod: (method) => set({ paymentMethod: method, onlinePaymentDetails: method === "cash" ? "" : get().onlinePaymentDetails }),
  setOnlinePaymentDetails: (details) => set({ onlinePaymentDetails: details }),

  setCustomization: (variantId, unitIdx, field, value) => {
    set((state) => {
      const units = state.customizations[variantId]
        ? [...state.customizations[variantId]]
        : [];
      const existing = units[unitIdx] || { name: "", number: "" };
      units[unitIdx] = { ...existing, [field]: value };
      return {
        customizations: { ...state.customizations, [variantId]: units },
      };
    });
  },

  setItemDiscount: (variantId, discount) => {
    set((state) => ({
      itemDiscounts: {
        ...state.itemDiscounts,
        [variantId]: Math.max(0, discount),
      },
    }));
  },

  setCustomizationDiscount: (variantId, discount) => {
    set((state) => ({
      customizationDiscounts: {
        ...state.customizationDiscounts,
        [variantId]: Math.max(0, discount),
      },
    }));
  },

  clearSale: () =>
    set({
      items: [],
      customerName: "",
      customerPhone: "",
      paymentMethod: "cash",
      onlinePaymentDetails: "",
      customizations: {},
      itemDiscounts: {},
      customizationDiscounts: {},
    }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  getCustomizationCount: () => {
    const { items, customizations } = get();
    return items.reduce((total, item) => {
      const units = customizations[item.variant_id] || [];
      const filledCount = units.filter(
        (u) => u?.name?.trim() || u?.number?.trim(),
      ).length;
      return total + filledCount;
    }, 0);
  },

  getTotalDiscount: (customizationPrice) => {
    const { items, itemDiscounts, customizationDiscounts, customizations } =
      get();
    let totalDiscount = 0;

    items.forEach((item) => {
      // Product price discount
      const itemDiscount = itemDiscounts[item.variant_id] || 0;
      totalDiscount += itemDiscount * item.quantity;

      // Customization discount
      const units = customizations[item.variant_id] || [];
      const filledCount = units.filter(
        (u) => u?.name?.trim() || u?.number?.trim(),
      ).length;
      const customizationDiscount =
        customizationDiscounts[item.variant_id] || 0;
      totalDiscount += customizationDiscount * filledCount;
    });

    return totalDiscount;
  },

  subtotal: (customizationPrice = 0) => {
    const { items, itemDiscounts, customizations, customizationDiscounts } =
      get();
    let total = 0;

    items.forEach((item) => {
      // Base price with discount
      const itemDiscount = itemDiscounts[item.variant_id] || 0;
      const unitPrice = Math.max(0, item.unit_price - itemDiscount);
      total += unitPrice * item.quantity;

      // Customization charge with discount
      if (customizationPrice > 0) {
        const units = customizations[item.variant_id] || [];
        const filledCount = units.filter(
          (u) => u?.name?.trim() || u?.number?.trim(),
        ).length;
        if (filledCount > 0) {
          const customizationDiscount =
            customizationDiscounts[item.variant_id] || 0;
          const customizationUnitPrice = Math.max(
            0,
            customizationPrice - customizationDiscount,
          );
          total += customizationUnitPrice * filledCount;
        }
      }
    });

    return total;
  },
}));
