import { createPublicServerClient } from "@/lib/supabase/public-server";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";

export async function FeaturedProducts() {
  let products = [];

  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(8);

    products = data || [];
  } catch {
    // Supabase not configured yet — show empty state
  }

  if (products.length === 0) return null;

  return (
    <section className="py-14 bg-muted/30 relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="absolute -right-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--theme-glow))" }}
        aria-hidden
      />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="size-4 text-primary fill-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Editor&apos;s Choice
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight section-title-accent">
              Featured Products
            </h2>
            <p className="text-muted-foreground text-sm mt-4">
              Handpicked favourites — quality you can trust
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-1.5 hidden sm:flex border-primary/30 text-primary hover:bg-primary/5"
            asChild
          >
            <Link href="/products/featured">
              View All <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="flex sm:hidden mt-6">
          <Button variant="outline" className="w-full gap-1.5" asChild>
            <Link href="/products/featured">
              View All Featured <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
