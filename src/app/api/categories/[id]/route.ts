import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  return user;
}

// GET - single category with subcategories
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: category, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    // Fetch subcategories
    const { data: subcategories } = await supabase
      .from("categories")
      .select("*")
      .eq("parent_id", id)
      .order("sort_order");

    // Fetch parent if exists
    let parent = null;
    if (category.parent_id) {
      const { data: parentData } = await supabase
        .from("categories")
        .select("*")
        .eq("id", category.parent_id)
        .single();
      parent = parentData;
    }

    return NextResponse.json({
      ...category,
      subcategories: subcategories || [],
      parent,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}

// PATCH - update category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Prevent updating id, created_at
    delete body.id;
    delete body.created_at;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A category with this slug already exists" },
          { status: 400 },
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// DELETE - remove category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Check for products using this category
    const { count: productCount } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (productCount && productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${productCount} product${productCount > 1 ? "s" : ""} use this category. Please reassign them first.`,
        },
        { status: 400 },
      );
    }

    // Check for subcategories
    const { count: subCount } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id);

    if (subCount && subCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: category has ${subCount} subcategor${subCount > 1 ? "ies" : "y"}. Please delete them first.`,
        },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
