import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Handle Supabase auth callbacks:
 * - Email confirmation (signup)
 * - Password recovery (forgot password → reset link)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to the target page or home
  return NextResponse.redirect(new URL(next, request.url));
}
