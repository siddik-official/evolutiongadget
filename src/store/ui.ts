"use client";

import { create } from "zustand";

interface UIState {
  cartOpen: boolean;
  mobileMenuOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  cartOpen: false,
  mobileMenuOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));
