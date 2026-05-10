import { Suspense } from "react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { NewArrivals } from "@/components/home/NewArrivals";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { TrustBadges } from "@/components/home/TrustBadges";
import { CTABanner } from "@/components/home/CTABanner";
import { TopSellingSection } from "@/components/home/TopSellingSection";
import { ProductGridSkeleton } from "@/components/skeleton-loaders";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Evolution Gadget — Premium Tech Made Simple",
  description:
    "A trusted destination for cutting-edge accessories and mobile marvels.",
};

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <TrustBadges />

      {/* Top Selling — animated scroll */}
      <Suspense
        fallback={
          <section className="container mx-auto px-4 py-14">
            <ProductGridSkeleton count={4} />
          </section>
        }
      >
        <TopSellingSection />
      </Suspense>

      {/* New Arrivals */}
      <Suspense
        fallback={
          <section className="container mx-auto px-4 py-14">
            <ProductGridSkeleton count={8} />
          </section>
        }
      >
        <NewArrivals />
      </Suspense>

      {/* Featured / Editor's Choice */}
      <Suspense
        fallback={
          <section className="container mx-auto px-4 py-14">
            <ProductGridSkeleton count={8} />
          </section>
        }
      >
        <FeaturedProducts />
      </Suspense>

      <CTABanner />
    </>
  );
}
