// ─── Facebook Feed Data Source ───
// Single Supabase query to fetch all active products with images, variants, and category.

import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { FeedProduct } from "./types";

/**
 * Fetches all active products with their category, images, and active variants.
 * Uses the public anon client — RLS already filters is_active = true.
 * Returns a single-roundtrip query result.
 */
export async function getCatalogFeedProducts(): Promise<FeedProduct[]> {
  const supabase = createPublicServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[facebook-feed] Failed to fetch products:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn("[facebook-feed] No active products found");
    return [];
  }

  // Map raw Supabase response to FeedProduct[]
  return data.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category_id: product.category_id,
    team: product.team,
    league: product.league,
    season: product.season,
    brand: product.brand,
    tags: product.tags ?? [],
    is_featured: product.is_featured,
    is_active: product.is_active,
    created_at: product.created_at,
    updated_at: product.updated_at,
    category: product.category ?? null,
    images: product.images ?? [],
    variants: (product.variants ?? []).filter(
      (v: { is_active: boolean }) => v.is_active,
    ),
  }));
}
