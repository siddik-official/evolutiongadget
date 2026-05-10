import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !callerProfile ||
      !["admin", "super_admin"].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsedTarget = Number(body?.sales_target);
    const targetMetric =
      (body?.sales_target_metric as "amount" | "orders" | undefined) ||
      "amount";
    const targetType = body?.sales_target_type as
      | "daily"
      | "weekly"
      | "monthly"
      | undefined;
    const targetStartDate = body?.sales_target_start_date as string | undefined;
    const targetEndDate = body?.sales_target_end_date as string | undefined;

    if (Number.isNaN(parsedTarget) || parsedTarget < 0) {
      return NextResponse.json(
        { error: "Sales target must be a non-negative number" },
        { status: 400 },
      );
    }

    const validMetrics = ["amount", "orders"];
    if (!validMetrics.includes(targetMetric)) {
      return NextResponse.json(
        { error: "Target metric must be amount or orders" },
        { status: 400 },
      );
    }

    const validTypes = ["daily", "weekly", "monthly"];
    if (!targetType || !validTypes.includes(targetType)) {
      return NextResponse.json(
        { error: "Target type must be daily, weekly, or monthly" },
        { status: 400 },
      );
    }

    if (!targetStartDate || !targetEndDate) {
      return NextResponse.json(
        { error: "Target start and end dates are required" },
        { status: 400 },
      );
    }

    const startDate = new Date(targetStartDate);
    const endDate = new Date(targetEndDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid target date range" },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Target start date must be before or equal to end date" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    const { data: targetProfile, error: findError } = await adminClient
      .from("admin_profiles")
      .select("id, role")
      .eq("user_id", id)
      .single();

    if (findError || !targetProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    if (targetProfile.role !== "moderator") {
      return NextResponse.json(
        { error: "Sales target can only be set for moderators" },
        { status: 400 },
      );
    }

    const { error: updateError } = await adminClient
      .from("admin_profiles")
      .update({
        sales_target: parsedTarget,
        sales_target_metric: targetMetric,
        sales_target_type: targetType,
        sales_target_start_date: targetStartDate,
        sales_target_end_date: targetEndDate,
      })
      .eq("user_id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sales_target: parsedTarget,
      sales_target_metric: targetMetric,
      sales_target_type: targetType,
      sales_target_start_date: targetStartDate,
      sales_target_end_date: targetEndDate,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !callerProfile ||
      !["admin", "super_admin"].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    // Delete profile first
    await adminClient.from("admin_profiles").delete().eq("user_id", id);

    // Delete auth user
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
