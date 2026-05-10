import { createPublicServerClient } from "@/lib/supabase/public-server";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export async function NewArrivals() {
  let products = [];

  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8);

    products = data || [];
  } catch {
    // Supabase not configured yet — show empty state
  }

  return (
    <section className="py-14 relative overflow-hidden">
      {/* subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/30 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Just Dropped
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight section-title-accent">
              New Arrivals
            </h2>
            <p className="text-muted-foreground text-sm mt-4">
              The latest additions to our collection
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-1.5 hidden sm:flex border-primary/30 text-primary hover:bg-primary/5"
            asChild
          >
            <Link href="/products/new-arrivals">
              View All <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="flex sm:hidden mt-6">
              <Button variant="outline" className="w-full gap-1.5" asChild>
                <Link href="/products/new-arrivals">
                  View All New Arrivals <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <Sparkles className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              New products will appear here once added from the admin panel.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/admin/products">Go to Admin Panel</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
