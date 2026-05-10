import { createPublicServerClient } from "@/lib/supabase/public-server";
import { TopSellingScroll } from "@/components/home/TopSelling";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function TopSellingSection() {
  let products = [];

  try {
    const supabase = createPublicServerClient();
    // Try to fetch featured products as "top selling" first
    const { data } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(12);

    // Fallback to any active products if none featured
    if (!data || data.length === 0) {
      const { data: fallback } = await supabase
        .from("products")
        .select(
          `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      products = fallback || [];
    } else {
      products = data;
    }
  } catch {
    // Supabase not configured yet
  }

  if (products.length === 0) return null;

  return (
    <section className="py-14 overflow-hidden relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/10 to-background pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest">
                <Flame className="size-3.5" />
                Hot Picks
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Top Selling
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Our customers&apos; most loved jerseys &amp; apparel
            </p>
          </div>
          <Button variant="ghost" className="gap-1 hidden sm:flex" asChild>
            <Link href="/products">
              View All <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Scrolling track — full bleed */}
      <div className="px-4">
        <TopSellingScroll products={products} />
      </div>

      <div className="container mx-auto px-4 mt-6 flex sm:hidden">
        <Button variant="outline" className="gap-1 w-full" asChild>
          <Link href="/products">
            View All Products <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
