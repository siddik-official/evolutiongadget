"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, Menu } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { Badge } from "@/components/ui/badge";

export function BottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  // Hide on admin and auth pages
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password")
  ) {
    return null;
  }

  const isHome = pathname === "/";
  const isSearch = pathname?.startsWith("/search");

  return (
    <>
      {/* Bottom-safe spacer so fixed bars never cover content */}
      <div className="h-16 sm:hidden" aria-hidden />

      <nav
        className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-[#161A22]/95 backdrop-blur-md border-t border-[#2A3140]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Bottom navigation"
      >
        <ul className="grid grid-cols-4">
          <li>
            <NavLink href="/" active={isHome} label="Home" icon={Home} />
          </li>
          <li>
            <NavLink
              href="/search"
              active={Boolean(isSearch)}
              label="Search"
              icon={Search}
            />
          </li>
          <li>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative w-full flex flex-col items-center justify-center gap-1 py-2.5 text-[#9AA4B2] hover:text-[#F5F7FA] transition-colors"
              aria-label="Cart"
            >
              <span className="relative">
                <ShoppingCart className="size-5" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] bg-[#2F6FED] text-white">
                    {totalItems}
                  </Badge>
                )}
              </span>
              <span className="text-[10px] font-medium tracking-wide">
                Cart
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-1 py-2.5 text-[#9AA4B2] hover:text-[#F5F7FA] transition-colors"
              aria-label="Menu"
            >
              <Menu className="size-5" />
              <span className="text-[10px] font-medium tracking-wide">
                Menu
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function NavLink({
  href,
  active,
  label,
  icon: Icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: typeof Home;
}) {
  return (
    <Link
      href={href}
      className={`relative w-full flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
        active ? "text-[#2F6FED]" : "text-[#9AA4B2] hover:text-[#F5F7FA]"
      }`}
    >
      <Icon className="size-5" />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-[#2F6FED]" />
      )}
    </Link>
  );
}
