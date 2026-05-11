"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Menu, Phone, Package } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchBar } from "@/components/SearchBar";
import {
  DynamicNavigation,
  MobileNavigation,
} from "@/components/DynamicNavigation";

export function Header() {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  const cartOpen = useUIStore((s) => s.cartOpen);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  return (
    <>
      {/* Top bar - desktop only */}
      <div className="bg-[var(--theme-dark)] text-[#E5E5E5] text-xs py-1.5 hidden sm:block">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              +8801931117525
            </span>
            <span>৳ Cash on Delivery Available</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Fast Delivery Inside Bangladesh 🇧🇩</span>
            <Link
              href="/track-order"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Package className="size-3" />
              Track Order
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-50 bg-[var(--theme-dark)] text-[#E5E5E5] border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
            {/* Logo */}
            <Logo
              className="scale-90 sm:scale-100 origin-left"
              textColor="text-[#E5E5E5]"
              taglineColor="text-[#E5E5E5]/80"
            />

            {/* Desktop nav */}
            <div
              className={`hidden lg:block transition-opacity ${searchExpanded ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <DynamicNavigation />
            </div>

            {/* Desktop actions — hidden on mobile (moved to BottomNav) */}
            <div className="hidden sm:flex items-center gap-2">
              <SearchBar
                onExpandChange={setSearchExpanded}
                triggerClassName="text-[#E5E5E5] hover:text-white"
              />

              <Button
                variant="ghost"
                size="icon"
                className="relative size-10 text-[#E5E5E5] hover:text-white"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="size-5" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 size-5 flex items-center justify-center rounded-full p-0 text-[10px]">
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {/* Desktop tablet menu (between sm and lg) */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden size-10 text-[#E5E5E5] hover:text-white"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[280px] p-0 bg-[var(--theme-dark)] text-[#E5E5E5] border-white/10"
                >
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                      <Logo
                        textColor="text-[#E5E5E5]"
                        taglineColor="text-[#E5E5E5]/75"
                      />
                    </div>

                    <MobileNavigation
                      onItemClick={() => setMobileMenuOpen(false)}
                    />

                    <div className="p-4 border-t border-white/10 bg-white/5 space-y-2">
                      <Link
                        href="/track-order"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-primary/10 text-primary rounded-lg"
                      >
                        <Package className="size-4" />
                        Track Order
                      </Link>
                      <a
                        href="tel:+8801931117525"
                        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[#E5E5E5]/80 hover:text-white"
                      >
                        <Phone className="size-4" />
                        +8801931117525
                      </a>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu Sheet — controlled by store, opened from BottomNav */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          className="w-[280px] p-0 bg-[var(--theme-dark)] text-[#E5E5E5] border-white/10 sm:hidden"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <Logo
                textColor="text-[#E5E5E5]"
                taglineColor="text-[#E5E5E5]/75"
              />
            </div>

            <MobileNavigation onItemClick={() => setMobileMenuOpen(false)} />

            <div className="p-4 border-t border-white/10 bg-white/5 space-y-2">
              <Link
                href="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-primary/10 text-primary rounded-lg"
              >
                <Package className="size-4" />
                Track Order
              </Link>
              <a
                href="tel:+8801931117525"
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[#E5E5E5]/80 hover:text-white"
              >
                <Phone className="size-4" />
                +8801931117525
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cart drawer */}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
