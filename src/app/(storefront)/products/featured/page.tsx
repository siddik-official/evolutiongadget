import { createPublicServerClient } from "@/lib/supabase/public-server";
import { ProductCard } from "@/components/ProductCard";
import { AllProductsFilters } from "@/components/products/AllProductsFilters";
import type { Metadata } from "next";
import Link from "next/link";
import type { Product, ProductVariant } from "@/types";

export const metadata: Metadata = {
  title: "Featured Products",
  description:
    "Shop our featured products at Evolution Gadget. Hand-picked selections. Cash on Delivery across Bangladesh.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const revalidate = 60;

export default async function FeaturedProductsPage({ searchParams }: Props) {
  const filters = await searchParams;

  let products: Product[] = [];

  try {
    const supabase = createPublicServerClient();

    // Build product query - fetch FEATURED products only
    let query = supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false });

    // Apply team filter
    if (filters.team && typeof filters.team === "string") {
      query = query.ilike("team", `%${filters.team}%`);
    }

    // Apply category filter (optional)
    if (filters.category && typeof filters.category === "string") {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", filters.category)
        .single();
      if (cat) {
        query = query.eq("category_id", cat.id);
      }
    }

    const { data } = await query;
    const allProducts = (data as Product[] | null) || [];

    // Apply client-side filters for size, color, and price
    const sizesFilter = filters.sizes
      ? (filters.sizes as string).split(",").filter(Boolean)
      : [];
    const colorsFilter = filters.colors
      ? (filters.colors as string).split(",").filter(Boolean)
      : [];
    const minPrice = filters.minPrice
      ? parseFloat(filters.minPrice as string)
      : null;
    const maxPrice = filters.maxPrice
      ? parseFloat(filters.maxPrice as string)
      : null;

    products = allProducts.filter((product) => {
      const variants = product.variants || [];

      // Filter by size
      if (sizesFilter.length > 0) {
        const hasMatchingSize = variants.some((v: ProductVariant) =>
          sizesFilter.includes(v.size),
        );
        if (!hasMatchingSize) return false;
      }

      // Filter by color
      if (colorsFilter.length > 0) {
        const hasMatchingColor = variants.some((v: ProductVariant) =>
          colorsFilter.includes(v.color ?? ""),
        );
        if (!hasMatchingColor) return false;
      }

      // Filter by price range
      if (minPrice !== null || maxPrice !== null) {
        const prices = variants.map(
          (v: ProductVariant) => v.discount_price ?? v.sale_price,
        );
        const minProductPrice =
          prices.length > 0 ? Math.min(...prices) : Infinity;

        if (minPrice !== null && minProductPrice < minPrice) return false;
        if (maxPrice !== null && minProductPrice > maxPrice) return false;
      }

      return true;
    });
  } catch {
    // Supabase not configured
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <span className="hover:text-primary">
          <Link href="/">Home</Link>
        </span>
        <span className="mx-2">/</span>
        <span className="text-foreground">Featured Products</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <AllProductsFilters />
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Featured Products</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground">
                No featured products yet. Mark products as featured in the admin
                panel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
