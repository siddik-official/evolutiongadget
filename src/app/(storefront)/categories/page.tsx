import { createPublicServerClient } from "@/lib/supabase/public-server";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Grid3X3 } from "lucide-react";
import type { Metadata } from "next";
import type { Category } from "@/types";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "All Categories | Evolution Gadget",
  description:
    "Browse all product categories at Evolution Gadget - tech accessories, mobile gadgets, and more.",
};

async function getCategories() {
  const supabase = createPublicServerClient();

  // Fetch all active categories
  const { data: allCategories, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return { rootCategories: [], subcategoriesByParent: {} };
  }

  const categories = (allCategories || []) as Category[];

  // Separate root categories and subcategories
  const rootCategories = categories.filter((c) => !c.parent_id);
  const subcategoriesByParent: Record<string, Category[]> = {};

  categories.forEach((cat) => {
    if (cat.parent_id) {
      if (!subcategoriesByParent[cat.parent_id]) {
        subcategoriesByParent[cat.parent_id] = [];
      }
      subcategoriesByParent[cat.parent_id].push(cat);
    }
  });

  return { rootCategories, subcategoriesByParent };
}

// Category icons/emojis mapping
const categoryIcons: Record<string, string> = {
  "club-jersey": "⚽",
  "national-team": "🏆",
  retro: "🎽",
  winter: "❄️",
  trouser: "👖",
  "football-accessories": "🎒",
  boots: "👟",
  footballs: "⚽",
  "goalkeeper-gloves": "🧤",
  "shin-guards": "🛡️",
  "football-socks": "🧦",
  "sports-bags": "👜",
};

export default async function CategoriesPage() {
  const { rootCategories, subcategoriesByParent } = await getCategories();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Grid3X3 className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">All Categories</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Explore our complete collection of football jerseys, sportswear, and
            accessories. Find everything you need for the beautiful game.
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rootCategories.map((category) => {
            const subcategories = subcategoriesByParent[category.id] || [];
            const icon = categoryIcons[category.slug] || "📦";

            return (
              <div
                key={category.id}
                className="group bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30"
              >
                {/* Category Image/Header */}
                <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-6xl opacity-50 group-hover:opacity-80 transition-opacity group-hover:scale-110 duration-300">
                      {icon}
                    </span>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <Link
                    href={`/category/${category.slug}`}
                    className="group/link"
                  >
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 group-hover/link:text-primary transition-colors">
                      {category.name}
                      <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                    </h2>
                  </Link>

                  {category.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {category.description}
                    </p>
                  )}

                  {/* Subcategories */}
                  {subcategories.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Subcategories
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {subcategories.map((subcat) => (
                          <Link
                            key={subcat.id}
                            href={`/category/${subcat.slug}`}
                          >
                            <Badge
                              variant="secondary"
                              className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                            >
                              {categoryIcons[subcat.slug] && (
                                <span className="mr-1">
                                  {categoryIcons[subcat.slug]}
                                </span>
                              )}
                              {subcat.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View All Button */}
                  <Link
                    href={`/category/${category.slug}`}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium group/btn"
                  >
                    View All Products
                    <ArrowRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {rootCategories.length === 0 && (
          <div className="text-center py-16">
            <Grid3X3 className="size-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No categories yet</h2>
            <p className="text-muted-foreground">
              Check back soon for our product categories.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
