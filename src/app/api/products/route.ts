import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "20",
      10,
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;

    const supabase = createAdminClient();

    let query = supabase
      .from("products")
      .select(
        `*, category:categories(*), images:product_images(*), variants:product_variants(*)`,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq("category_id", category);
    }

    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,team.ilike.%${search}%,league.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(data);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900",
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
