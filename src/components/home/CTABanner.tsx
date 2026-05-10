import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, MessageCircle } from "lucide-react";

export function CTABanner() {
  return (
    <section
      className="relative text-white overflow-hidden"
      style={{ background: `linear-gradient(to bottom right, var(--theme-dark-from), var(--theme-dark-via), var(--theme-dark-to))` }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(rgba(var(--theme-grid-rgb), 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--theme-grid-rgb), 0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />

      {/* Glow */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-[0.15] blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--theme-glow))" }}
        aria-hidden
      />

      <div className="container mx-auto px-4 py-16 sm:py-20 relative text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6">
          <ShoppingBag className="size-3.5" />
          Limited Stock Available
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight max-w-2xl mx-auto">
          Find Your{" "}
          <span className="text-primary">Perfect Fit</span> Today
        </h2>

        <p className="mt-4 text-white/60 max-w-lg mx-auto text-base leading-relaxed">
          Explore premium jerseys, stylish t-shirts &amp; sportswear curated for
          every occasion. Bold design, unmatched comfort.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Button
            size="lg"
            className="gap-2 text-base px-7 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            asChild
          >
            <Link href="/products">
              Shop All Products <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-base border-white/20 text-white hover:bg-white/10 hover:text-white bg-white/5"
            asChild
          >
            <Link href="/contact">
              <MessageCircle className="size-4" />
              Contact Us
            </Link>
          </Button>
        </div>

        {/* Bottom trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-white/35 font-medium">
          <span>✅ Cash on Delivery</span>
          <span>✅ Authentic Products</span>
          <span>✅ Nationwide Shipping</span>
          <span>✅ Easy Exchange</span>
        </div>
      </div>
    </section>
  );
}
