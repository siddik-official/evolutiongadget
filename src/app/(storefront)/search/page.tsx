import { createPublicServerClient } from "@/lib/supabase/public-server";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Search",
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  let products = [];

  if (q && q.trim()) {
    try {
      const supabase = createPublicServerClient();
      const { data } = await supabase
        .from("products")
        .select(
          `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
        )
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,team.ilike.%${q}%,league.ilike.%${q}%`)
        .limit(20);

      products = data || [];
    } catch {
      // Supabase not configured
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search Products</h1>

      <form action="/search" method="GET" className="max-w-md mb-8">
        <Input
          name="q"
          defaultValue={q || ""}
          placeholder="Search by name, team, league..."
          className="h-11"
          autoFocus
        />
      </form>

      {q && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {products.length} result{products.length !== 1 ? "s" : ""} for
            &quot;{q}&quot;
          </p>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground">
                No products found matching your search.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
