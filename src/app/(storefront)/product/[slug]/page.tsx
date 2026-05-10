import { createPublicServerClient } from "@/lib/supabase/public-server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductDetail } from "@/components/product/ProductDetail";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import {
  ProductDetailSkeleton,
  ProductGridSkeleton,
} from "@/components/skeleton-loaders";
import type { Metadata } from "next";
import type { Product } from "@/types";
import Link from "next/link";

const SUGGESTION_LIMIT = 4;
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

async function ProductDetailContent({ slug }: { slug: string }) {
  const supabase = createPublicServerClient();

  const { data } = await supabase
    .from("products")
    .select(
      `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) {
    notFound();
  }

  return <ProductDetail product={data as Product} />;
}

async function RelatedProductsContent({ slug }: { slug: string }) {
  const supabase = createPublicServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, category_id, team, tags")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) return null;

  const suggestionMap = new Map<string, Product>();

  const appendSuggestions = (items: Product[] | null) => {
    if (!items) return;
    for (const item of items) {
      if (item.id === product.id) continue;
      if (!suggestionMap.has(item.id)) {
        suggestionMap.set(item.id, item);
      }
      if (suggestionMap.size >= SUGGESTION_LIMIT) break;
    }
  };

  if (product.category_id) {
    const { data: sameCategory } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(8);

    appendSuggestions(sameCategory as Product[] | null);
  }

  if (suggestionMap.size < SUGGESTION_LIMIT && product.team) {
    const { data: sameTeam } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .eq("team", product.team)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(8);

    appendSuggestions(sameTeam as Product[] | null);
  }

  if (
    suggestionMap.size < SUGGESTION_LIMIT &&
    Array.isArray(product.tags) &&
    product.tags.length > 0
  ) {
    const { data: sameTags } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .overlaps("tags", product.tags)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(12);

    appendSuggestions(sameTags as Product[] | null);
  }

  if (suggestionMap.size < SUGGESTION_LIMIT) {
    const { data: latest } = await supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(16);

    appendSuggestions(latest as Product[] | null);
  }

  const relatedProducts = Array.from(suggestionMap.values()).slice(
    0,
    SUGGESTION_LIMIT,
  );

  if (relatedProducts.length === 0) return null;

  return <RelatedProducts products={relatedProducts} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = createPublicServerClient();
    const { data: product } = await supabase
      .from("products")
      .select("name, description")
      .eq("slug", slug)
      .single();

    if (product) {
      return {
        title: product.name,
        description: product.description || `Buy ${product.name} at Evolution Gadget`,
      };
    }
  } catch {
    // Supabase not configured
  }
  return { title: "Product" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  // First check if product exists for breadcrumb
  const supabase = createPublicServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, category:categories(id, name, slug)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) {
    notFound();
  }

  const breadcrumbCategoryRaw = product.category as unknown;
  const breadcrumbCategoryCandidate = Array.isArray(breadcrumbCategoryRaw)
    ? breadcrumbCategoryRaw[0]
    : breadcrumbCategoryRaw;

  const breadcrumbCategory =
    breadcrumbCategoryCandidate &&
    typeof breadcrumbCategoryCandidate === "object" &&
    "slug" in breadcrumbCategoryCandidate &&
    "name" in breadcrumbCategoryCandidate
      ? {
          slug: String((breadcrumbCategoryCandidate as { slug: string }).slug),
          name: String((breadcrumbCategoryCandidate as { name: string }).name),
        }
      : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-2">/</span>
        {breadcrumbCategory && (
          <>
            <Link
              href={`/category/${breadcrumbCategory.slug}`}
              className="hover:text-primary"
            >
              {breadcrumbCategory.name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Product Detail with Skeleton Loading */}
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent slug={slug} />
      </Suspense>

      {/* Related Products with Skeleton Loading */}
      <div className="mt-12">
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <RelatedProductsContent slug={slug} />
        </Suspense>
      </div>
    </div>
  );
}
