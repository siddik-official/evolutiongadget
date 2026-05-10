"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Users,
  Images,
  FolderTree,
  Ticket,
  Megaphone,
  Warehouse,
  User,
} from "lucide-react";
import { useState } from "react";
import type { AdminRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AdminRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "super_admin", "manager", "storeman"],
  },
  {
    href: "/admin/profile",
    label: "My Profile",
    icon: User,
    roles: ["admin", "super_admin", "manager", "storeman", "moderator"],
  },
  {
    href: "/admin/pos",
    label: "POS",
    icon: Store,
    roles: ["admin", "super_admin", "manager"],
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    roles: ["admin", "super_admin", "storeman", "moderator"],
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: Warehouse,
    roles: ["admin", "super_admin", "storeman", "manager", "moderator"],
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: FolderTree,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: Ticket,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
    roles: ["admin", "super_admin", "manager", "moderator"],
  },
  {
    href: "/admin/my-sales",
    label: "My Sales",
    icon: BarChart3,
    roles: ["moderator"],
  },
  {
    href: "/admin/moderators",
    label: "Moderators",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/media",
    label: "Media",
    icon: Images,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: Megaphone,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin", "super_admin"],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useAdminRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role),
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-sidebar-background text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <Logo textColor="text-white" />
        <p className="text-xs text-sidebar-foreground/60 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-sidebar-accent animate-pulse"
              />
            ))
          : filteredItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar-background border-b border-sidebar-border p-3 flex items-center justify-between text-sidebar-foreground">
        <Logo textColor="text-white" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar-background border-r border-sidebar-border transform transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
