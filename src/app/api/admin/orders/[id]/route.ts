import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

    // Check if user can delete orders
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !adminProfile ||
      !["admin", "super_admin"].includes(adminProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete order using admin client
    const adminSupabase = createAdminClient();
    const { id } = await params;

    console.log(`[DELETE ORDER] Attempting to delete order: ${id}`);

    // Delete order (order_items will cascade delete automatically)
    const { error } = await adminSupabase.from("orders").delete().eq("id", id);

    if (error) {
      console.error(`[DELETE ORDER] Error deleting order ${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[DELETE ORDER] Successfully deleted order: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE ORDER] Exception during delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
