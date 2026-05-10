import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET - list coupons
// Public: returns active public coupons (for checkout)
// Admin (?all=true): returns all coupons
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const all = request.nextUrl.searchParams.get("all") === "true";

  let query = supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (!all) {
    // Public view: only active, public, and valid coupons
    const now = new Date().toISOString();
    query = query
      .eq("is_active", true)
      .eq("is_public", true)
      .lte("valid_from", now);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out expired coupons for public view
  let coupons = data ?? [];
  if (!all) {
    const now = new Date();
    coupons = coupons.filter(
      (c) => !c.valid_until || new Date(c.valid_until) >= now
    );
  }

  return NextResponse.json(coupons);
}

// POST - create new coupon (admin only)
export async function POST(request: NextRequest) {
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount,
    usage_limit,
    valid_from,
    valid_until,
    is_active,
    is_public,
  } = body;

  if (!code?.trim()) {
    return NextResponse.json(
      { error: "Coupon code is required" },
      { status: 400 }
    );
  }

  if (!discount_value || discount_value <= 0) {
    return NextResponse.json(
      { error: "Discount value must be greater than 0" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: code.trim().toUpperCase(),
      description: description || null,
      discount_type: discount_type || "percentage",
      discount_value,
      min_order_amount: min_order_amount || 0,
      max_discount: max_discount || null,
      usage_limit: usage_limit || null,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      is_active: is_active ?? true,
      is_public: is_public ?? false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
