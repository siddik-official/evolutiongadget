import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code?.trim()) {
      return NextResponse.json(
        { valid: false, error: "Please enter a coupon code" },
        { status: 400 }
      );
    }

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json(
        { valid: false, error: "Invalid order subtotal" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find coupon by code
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (error || !coupon) {
      return NextResponse.json({
        valid: false,
        error: "Invalid coupon code",
      });
    }

    // Check if active
    if (!coupon.is_active) {
      return NextResponse.json({
        valid: false,
        error: "This coupon is no longer active",
      });
    }

    // Check validity dates
    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
      return NextResponse.json({
        valid: false,
        error: "This coupon is not yet valid",
      });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "This coupon has expired",
      });
    }

    // Check usage limit
    if (
      coupon.usage_limit !== null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return NextResponse.json({
        valid: false,
        error: "This coupon has reached its usage limit",
      });
    }

    // Check minimum order amount
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount of ৳${coupon.min_order_amount} required`,
      });
    }

    // Calculate discount
    let discount_amount = 0;
    if (coupon.discount_type === "percentage") {
      discount_amount = (subtotal * coupon.discount_value) / 100;
      // Apply max discount cap if set
      if (coupon.max_discount && discount_amount > coupon.max_discount) {
        discount_amount = coupon.max_discount;
      }
    } else {
      // Fixed discount
      discount_amount = coupon.discount_value;
      // Don't allow discount greater than subtotal
      if (discount_amount > subtotal) {
        discount_amount = subtotal;
      }
    }

    // Round to 2 decimal places
    discount_amount = Math.round(discount_amount * 100) / 100;

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
      discount_amount,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
