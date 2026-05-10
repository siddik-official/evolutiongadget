"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Grid3X3 } from "lucide-react";
import type { Category } from "@/types";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

interface NavCategory extends Category {
  subcategories: Category[];
}

interface NavigationData {
  header: NavCategory[];
  all: NavCategory[];
}

let navigationDataPromise: Promise<NavigationData> | null = null;

async function getNavigationData(): Promise<NavigationData> {
  if (!navigationDataPromise) {
    navigationDataPromise = (async () => {
      const [headerResponse, allResponse] = await Promise.all([
        fetch("/api/categories/header"),
        fetch("/api/categories"),
      ]);

      const headerData: NavCategory[] = headerResponse.ok
        ? await headerResponse.json()
        : [];
      const allData: Category[] = allResponse.ok
        ? await allResponse.json()
        : [];

      const rootCategories = allData.filter((category) => !category.parent_id);
      const categoriesWithSubs = rootCategories.map((category) => ({
        ...category,
        subcategories: allData.filter((item) => item.parent_id === category.id),
      }));

      return {
        header: headerData,
        all: categoriesWithSubs,
      };
    })().catch((error) => {
      navigationDataPromise = null;
      throw error;
    });
  }

  return navigationDataPromise;
}

// Custom Categories Dropdown with nested flyouts (StarTech style)
function CategoriesDropdown({ categories }: { categories: NavCategory[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        setIsOpen(false);
        setActiveCategory(null);
      }}
    >
      {/* Trigger Button */}
      <button
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium",
          "bg-transparent text-[#E5E5E5] hover:bg-white/10 hover:text-white transition-colors",
          isOpen && "bg-white/10 text-white",
        )}
      >
        Categories
        <ChevronDown
          className={cn(
            "size-3 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Main Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50">
          <div className="bg-popover text-popover-foreground border rounded-md shadow-lg min-w-[250px]">
            <ul className="py-1">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="relative"
                  onMouseEnter={() => setActiveCategory(category.id)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <Link
                    href={`/category/${category.slug}`}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-sm text-popover-foreground",
                      "hover:bg-primary hover:text-primary-foreground transition-colors",
                      activeCategory === category.id &&
                        category.subcategories.length > 0 &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    <span>{category.name}</span>
                    {category.subcategories.length > 0 && (
                      <ChevronRight className="size-4" />
                    )}
                  </Link>

                  {/* Subcategories Flyout */}
                  {category.subcategories.length > 0 &&
                    activeCategory === category.id && (
                      <div className="absolute left-full top-0 ml-0 z-50">
                        <div className="bg-popover text-popover-foreground border rounded-md shadow-lg min-w-[200px]">
                          <ul className="py-1">
                            {category.subcategories.map((subcat) => (
                              <li key={subcat.id}>
                                <Link
                                  href={`/category/${subcat.slug}`}
                                  className="block px-4 py-2.5 text-sm text-popover-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  {subcat.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                </li>
              ))}
              {/* View All Categories */}
              <li className="border-t">
                <Link
                  href="/categories"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-popover-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Grid3X3 className="size-4" />
                  View All Categories
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function DynamicNavigation() {
  const [navItems, setNavItems] = useState<NavCategory[]>([]);
  const [allCategories, setAllCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNavCategories = async () => {
      try {
        const data = await getNavigationData();
        setNavItems(data.header);
        setAllCategories(data.all);
      } catch (error) {
        console.error("Error fetching navigation categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNavCategories();
  }, []);

  if (loading) {
    return (
      <nav className="hidden lg:flex items-center gap-1">
        <Link
          href="/"
          className="px-3 py-2 text-sm font-medium text-[#E5E5E5] hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          Home
        </Link>
        <Link
          href="/categories"
          className="px-3 py-2 text-sm font-medium text-[#E5E5E5] hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          Categories
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {/* Home Link */}
      <Link
        href="/"
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
          "bg-transparent text-[#E5E5E5] hover:bg-white/10 hover:text-white transition-colors",
        )}
      >
        Home
      </Link>

      {/* Custom Categories Dropdown (StarTech style) */}
      <CategoriesDropdown categories={allCategories} />

      {/* Individual Category Links from header */}
      {navItems.map((category) => (
        <CategoryNavItem key={category.id} category={category} />
      ))}
    </nav>
  );
}

// Individual category nav item with optional dropdown
function CategoryNavItem({ category }: { category: NavCategory }) {
  const [isOpen, setIsOpen] = useState(false);

  if (category.subcategories.length === 0) {
    return (
      <Link
        href={`/category/${category.slug}`}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
          "bg-transparent text-[#E5E5E5] hover:bg-white/10 hover:text-white transition-colors",
        )}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium",
          "bg-transparent text-[#E5E5E5] hover:bg-white/10 hover:text-white transition-colors",
          isOpen && "bg-white/10 text-white",
        )}
      >
        {category.name}
        <ChevronDown
          className={cn(
            "size-3 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50">
          <div className="bg-popover text-popover-foreground border rounded-md shadow-lg min-w-[200px]">
            <ul className="py-1">
              {/* All category link */}
              <li>
                <Link
                  href={`/category/${category.slug}`}
                  className="block px-4 py-2.5 text-sm font-medium text-popover-foreground border-b hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  All {category.name}
                </Link>
              </li>
              {/* Subcategories */}
              {category.subcategories.map((subcat) => (
                <li key={subcat.id}>
                  <Link
                    href={`/category/${subcat.slug}`}
                    className="block px-4 py-2.5 text-sm text-popover-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {subcat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile navigation component for the sheet menu
export function MobileNavigation({
  onItemClick,
}: {
  onItemClick?: () => void;
}) {
  const [navItems, setNavItems] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const fetchNavCategories = async () => {
      try {
        const data = await getNavigationData();
        setNavItems(data.header);
      } catch (error) {
        console.error("Error fetching navigation categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNavCategories();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <nav className="flex-1 overflow-auto py-2">
        <Link
          href="/"
          onClick={onItemClick}
          className="flex items-center px-4 py-3 text-sm font-medium text-[#E5E5E5]/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
        >
          Home
        </Link>
        <Link
          href="/categories"
          onClick={onItemClick}
          className="flex items-center px-4 py-3 text-sm font-medium text-[#E5E5E5]/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
        >
          Categories
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-auto py-2">
      {/* Home - always first */}
      <Link
        href="/"
        onClick={onItemClick}
        className="flex items-center px-4 py-3 text-sm font-medium text-[#E5E5E5]/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
      >
        Home
      </Link>

      {/* Categories link */}
      <Link
        href="/categories"
        onClick={onItemClick}
        className="flex items-center px-4 py-3 text-sm font-medium text-[#E5E5E5]/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
      >
        All Categories
      </Link>

      {/* Dynamic categories */}
      {navItems.map((category) => (
        <div key={category.id}>
          {category.subcategories.length > 0 ? (
            // Category with subcategories
            <>
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#E5E5E5]/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
              >
                <span>{category.name}</span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    expandedCategories.has(category.id) && "rotate-180",
                  )}
                />
              </button>
              {expandedCategories.has(category.id) && (
                <div className="bg-white/5">
                  <Link
                    href={`/category/${category.slug}`}
                    onClick={onItemClick}
                    className="flex items-center px-6 py-2.5 text-sm text-[#E5E5E5]/70 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
                  >
                    All {category.name}
                  </Link>
                  {category.subcategories.map((subcat) => (
                    <Link
                      key={subcat.id}
                      href={`/category/${subcat.slug}`}
                      onClick={onItemClick}
                      className="flex items-center px-6 py-2.5 text-sm text-[#E5E5E5]/70 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
                    >
                      {subcat.name}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Category without subcategories
            <Link
              href={`/category/${category.slug}`}
              onClick={onItemClick}
              className="flex items-center px-4 py-3 text-sm font-medium text-[#E5E5E5]/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
            >
              {category.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
