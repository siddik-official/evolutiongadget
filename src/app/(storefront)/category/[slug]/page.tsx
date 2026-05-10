import { createPublicServerClient } from "@/lib/supabase/public-server";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilters } from "@/components/category/CategoryFilters";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { Product, ProductVariant } from "@/types";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = createPublicServerClient();
    const { data: cat } = await supabase
      .from("categories")
      .select("name, description")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    const name =
      cat?.name ??
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const desc =
      cat?.description ??
      `Shop ${name} at Evolution Gadget. Cash on Delivery across Bangladesh.`;
    return { title: name, description: desc };
  } catch {
    const name = slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { title: name };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const filters = await searchParams;

  let category = null;
  let products: Product[] = [];

  try {
    const supabase = createPublicServerClient();

    // Fetch category
    const { data: cat } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!cat) {
      notFound();
    }
    category = cat;

    // Get all category IDs to query (current category + all subcategories)
    const categoryIds = [category.id];

    // Check if this category has subcategories (is a parent category)
    const { data: subcategories } = await supabase
      .from("categories")
      .select("id")
      .eq("parent_id", category.id)
      .eq("is_active", true);

    if (subcategories && subcategories.length > 0) {
      // Add all subcategory IDs to the list
      categoryIds.push(...subcategories.map((sub) => sub.id));
    }

    // Build product query - include products from this category AND all subcategories
    let query = supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .in("category_id", categoryIds)
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.team && typeof filters.team === "string") {
      query = query.ilike("team", `%${filters.team}%`);
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

  const categoryName =
    category?.name ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <span className="hover:text-primary">
          <Link href="/">Home</Link>
        </span>
        <span className="mx-2">/</span>
        <span className="text-foreground">{categoryName}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <CategoryFilters slug={slug} />
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{categoryName}</h1>
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
                No products found in this category yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
