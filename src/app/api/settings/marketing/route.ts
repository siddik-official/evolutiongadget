import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Marketing settings keys
const MARKETING_KEYS = [
  "meta_pixel_enabled",
  "meta_pixel_id",
  "meta_access_token",
  "gtm_enabled",
  "gtm_id",
];

// Public keys that can be read by the storefront (no sensitive data like access_token)
const PUBLIC_MARKETING_KEYS = [
  "meta_pixel_enabled",
  "meta_pixel_id",
  "gtm_enabled",
  "gtm_id",
];

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";

    const keysToFetch = isPublic ? PUBLIC_MARKETING_KEYS : MARKETING_KEYS;

    const { data, error } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", keysToFetch);

    if (error) throw error;

    // Convert array to object { key: value }
    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value ?? "";
    }

    const response = NextResponse.json(settings);
    response.headers.set(
      "Cache-Control",
      isPublic
        ? "public, s-maxage=300, stale-while-revalidate=900"
        : "private, no-store",
    );
    return response;
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body: Record<string, string> = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (!MARKETING_KEYS.includes(key)) continue;
      const { error } = await supabase
        .from("store_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save marketing settings" },
      { status: 500 },
    );
  }
}
