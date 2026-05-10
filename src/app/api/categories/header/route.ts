import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category } from "@/types";

// GET - fetch categories for header navigation (with subcategories)
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all active categories
    const { data: allCategories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const categories = (allCategories || []) as Category[];

    // Get parent categories that should show in header
    const headerCategories = categories.filter(
      (c) => c.show_in_header && !c.parent_id,
    );

    // Build navigation items with subcategories
    const navItems = headerCategories.map((category) => ({
      ...category,
      subcategories: categories.filter(
        (c) => c.parent_id === category.id && c.is_active,
      ),
    }));

    const response = NextResponse.json(navItems);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=1800",
    );
    return response;
  } catch (error) {
    console.error("Error fetching header categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch header categories" },
      { status: 500 },
    );
  }
}
