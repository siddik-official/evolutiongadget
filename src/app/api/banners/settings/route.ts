import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET — public: returns banner settings
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banner_settings")
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ transition_seconds: 5 });
  }

  return NextResponse.json(data);
}

// PUT — admin only: update transition_seconds
export async function PUT(request: NextRequest) {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transition_seconds } = await request.json();
  if (
    typeof transition_seconds !== "number" ||
    transition_seconds < 1 ||
    transition_seconds > 30
  ) {
    return NextResponse.json(
      { error: "transition_seconds must be between 1 and 30" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  // Upsert: there is always exactly one row in banner_settings
  const { data: existing } = await supabase
    .from("banner_settings")
    .select("id")
    .single();

  let result;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("banner_settings")
      .update({
        transition_seconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from("banner_settings")
      .insert({ transition_seconds })
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json(result);
}
