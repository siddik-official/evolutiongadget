import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET — public: returns active banners + settings for storefront
// GET ?all=true — admin: returns all banners
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const all = request.nextUrl.searchParams.get("all") === "true";

  const query = supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!all) query.eq("is_active", true);

  const { data: banners, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: settings } = await supabase
    .from("banner_settings")
    .select("*")
    .single();

  return NextResponse.json({ banners: banners ?? [], settings });
}

// POST — admin only: add a new banner record
export async function POST(request: NextRequest) {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { image_url, storage_path, title, link_url, alt_text, sort_order } =
    body;

  if (!image_url || !storage_path) {
    return NextResponse.json(
      { error: "image_url and storage_path are required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banners")
    .insert({
      image_url,
      storage_path,
      title: title || null,
      link_url: link_url || null,
      alt_text: alt_text || null,
      sort_order: sort_order ?? 0,
      is_active: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
