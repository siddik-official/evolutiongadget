import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to change password for authenticated users.
 * Requires current password verification and uses server-side auth with admin key.
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 */

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing current or new password" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    // Get auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: No valid session" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let userEmail: string | null = null;
    let userId: string | null = null;

    try {
      // Decode JWT to get user info without verification (for getting email)
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      const decoded = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf-8"),
      );
      userEmail = decoded.email;
      userId = decoded.sub;
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 401 },
      );
    }

    // Create client with anon key to verify current password
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    // Create admin client to update password
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Update password using admin API
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update password" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
