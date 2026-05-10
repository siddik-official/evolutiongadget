import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Public keys readable by storefront
const PUBLIC_KEYS = [
  // Theme & appearance
  "theme_active",
  "theme_custom_primary",
  "theme_custom_background",
  "theme_custom_foreground",
  "theme_custom_secondary",
  "theme_custom_accent",
  "customization_enabled",
  "customization_price",
  "customization_option_paid_enabled",
  "customization_option_whatsapp_enabled",
  "customization_whatsapp_text",
  "customization_whatsapp_number",
  "customization_option_facebook_enabled",
  "customization_facebook_text",
  "customization_facebook_link",
  "customization_requires_advance",
  "whatsapp_number",
  // Payment settings
  "payment_cod_enabled",
  "payment_advance_enabled",
  "payment_bkash_number",
  "payment_nagad_number",
  "payment_advance_type", // 'delivery', 'half', 'full'
  // Delivery area rules
  "delivery_dhaka_city_areas",
  "delivery_sub_dhaka_areas",
  // Footer settings
  "footer_phone",
  "footer_email",
  "footer_address",
  "footer_facebook_url",
  "footer_instagram_url",
  "footer_brand_description",
  "footer_google_maps_url",
  // Policy pages
  "policy_about_us",
  "policy_shipping",
  "policy_returns",
  "policy_privacy",
  "policy_terms",
];

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", PUBLIC_KEYS);

    if (error) throw error;

    // Convert array to object { key: value }
    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value ?? "";
    }

    const response = NextResponse.json(settings);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900",
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

    let touchedTheme = false;
    for (const [key, value] of Object.entries(body)) {
      if (!PUBLIC_KEYS.includes(key)) continue;
      if (key.startsWith("theme_")) touchedTheme = true;
      const { error } = await supabase
        .from("store_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    }

    if (touchedTheme) revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
