import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can manage products
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !adminProfile ||
      !["admin", "super_admin", "storeman"].includes(adminProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { id } = await params;

    const { data, error } = await adminSupabase
      .from("products")
      .select(
        "*, category:categories(*), variants:product_variants(*), images:product_images(*)",
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("Exception fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can manage products
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !adminProfile ||
      !["admin", "super_admin", "storeman"].includes(adminProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { id } = await params;
    const body = await request.json();

    const { error } = await adminSupabase
      .from("products")
      .update({ is_active: body.is_active })
      .eq("id", id);

    if (error) {
      console.error("Error updating product:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exception updating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can manage products
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !adminProfile ||
      !["admin", "super_admin", "storeman"].includes(adminProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete product using admin client
    const adminSupabase = createAdminClient();
    const { id } = await params;

    // Check if product has orders first
    const { data: orderItems, error: checkError } = await adminSupabase
      .from("order_items")
      .select("id")
      .eq("product_id", id)
      .limit(1);

    console.log(`[DELETE] Product ${id} - Order check:`, {
      orderCount: orderItems?.length || 0,
      hasOrders: orderItems && orderItems.length > 0,
      checkError: checkError?.message,
    });

    if (checkError) {
      console.error("Error checking orders:", checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (orderItems && orderItems.length > 0) {
      console.log(
        `[DELETE] Product ${id} - BLOCKED: Has ${orderItems.length} orders`,
      );
      return NextResponse.json(
        {
          error: "Cannot delete product that has been ordered",
          code: "HAS_ORDERS",
        },
        { status: 400 },
      );
    }

    // Delete associated images first (if not cascade)
    await adminSupabase.from("product_images").delete().eq("product_id", id);

    console.log(`[DELETE] Product ${id} - Attempting deletion...`);

    // Delete product (variants cascade automatically)
    const { error } = await adminSupabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[DELETE] Product ${id} - Delete error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[DELETE] Product ${id} - Successfully deleted`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exception during delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
