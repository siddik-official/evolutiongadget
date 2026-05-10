import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

// GET - list all categories (with optional parent_id filter)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const parentId = request.nextUrl.searchParams.get("parent_id");
    const includeInactive = request.nextUrl.searchParams.get("all") === "true";
    const showInHeader =
      request.nextUrl.searchParams.get("show_in_header") === "true";

    let query = supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    // Filter by parent_id
    if (parentId === "null") {
      query = query.is("parent_id", null);
    } else if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    // Filter active only unless all=true
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Filter by show_in_header
    if (showInHeader) {
      query = query.eq("show_in_header", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    const response = NextResponse.json(data || []);
    response.headers.set(
      "Cache-Control",
      includeInactive
        ? "private, no-store"
        : "public, s-maxage=600, stale-while-revalidate=1800",
    );
    return response;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// POST - create new category (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      parent_id,
      sort_order,
      is_active,
      show_in_header,
      variant_options,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        slug: slug || slugify(name),
        description: description || null,
        parent_id: parent_id || null,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
        show_in_header: show_in_header ?? false,
        variant_options: variant_options || {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique violation
        return NextResponse.json(
          { error: "A category with this slug already exists" },
          { status: 400 },
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
