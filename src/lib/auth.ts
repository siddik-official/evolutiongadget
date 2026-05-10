import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/types";

export async function getCurrentUserRole(): Promise<AdminRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (profile?.role as AdminRole) ?? null;
}
