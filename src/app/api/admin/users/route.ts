import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
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

    // Get all admin profiles using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: profiles, error } = await adminClient
      .from("admin_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const profilesWithEmail = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data } = await adminClient.auth.admin.getUserById(
          profile.user_id,
        );
        return {
          ...profile,
          email: data?.user?.email || "N/A",
        };
      }),
    );

    return NextResponse.json(profilesWithEmail);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { email, full_name, role, sales_target } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: "Email, full name, and role are required" },
        { status: 400 },
      );
    }

    const validRoles = ["admin", "manager", "storeman", "moderator"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const parsedTarget = Number(sales_target ?? 0);
    if (Number.isNaN(parsedTarget) || parsedTarget < 0) {
      return NextResponse.json(
        { error: "Sales target must be a non-negative number" },
        { status: 400 },
      );
    }

    // Create auth user via invite flow so Supabase sends verification email.
    // User remains unconfirmed until they accept the invite.
    const adminClient = createAdminClient();
    const { data: invitedUser, error: authError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${request.nextUrl.origin}/auth/callback?next=/admin/login`,
        data: { full_name },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!invitedUser?.user?.id) {
      return NextResponse.json(
        { error: "Failed to create invited user" },
        { status: 500 },
      );
    }

    // Create admin profile
    const { error: profileError } = await adminClient
      .from("admin_profiles")
      .insert({
        user_id: invitedUser.user.id,
        full_name,
        role,
        sales_target: role === "moderator" ? Math.max(0, parsedTarget) : 0,
      });

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(invitedUser.user.id);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: invitedUser.user.id,
      email,
      full_name,
      role,
      sales_target: role === "moderator" ? Math.max(0, parsedTarget) : 0,
      message:
        "User invited successfully. A verification email has been sent and the account will be active after confirmation.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
