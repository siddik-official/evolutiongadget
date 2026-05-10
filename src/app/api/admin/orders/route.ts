import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateOrderId } from "@/lib/utils";
import {
  DELIVERY_DHAKA_CITY_AREAS_KEY,
  DELIVERY_SUB_DHAKA_AREAS_KEY,
  getDivisionByDistrict,
  isValidDistrict,
  readDeliveryAreaSettings,
  resolveDeliveryZone,
} from "@/lib/delivery";

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("admin_profiles")
      .select("id, role, full_name")
      .eq("user_id", user.id)
      .single();

    if (
      !profile ||
      !["admin", "super_admin", "manager", "moderator"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      district,
      area,
      address,
      notes,
      platform,
      items,
      payment_method = "cod",
      payment_details,
      recommended_by_profile_id,
      delivery_charge_override,
      // Advance payment fields
      advance_payment_method,
      advance_payment_amount,
      advance_payment_sender_phone,
      advance_payment_txn_id,
      delivery_payment_status,
    } = body;

    // ─── Validation ───
    if (!customer_name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!customer_phone?.trim()) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const districtValue = district?.trim();
    const areaValue = area?.trim() || null;

    if (!districtValue || !address?.trim()) {
      return NextResponse.json(
        { error: "Complete address is required" },
        { status: 400 },
      );
    }

    if (!isValidDistrict(districtValue)) {
      return NextResponse.json(
        { error: "Please select a valid district" },
        { status: 400 },
      );
    }

    if (districtValue === "Dhaka" && !areaValue) {
      return NextResponse.json(
        {
          error:
            "City/Area is required for Dhaka district to calculate delivery charge",
        },
        { status: 400 },
      );
    }

    const divisionValue = getDivisionByDistrict(districtValue);
    if (!divisionValue) {
      return NextResponse.json(
        { error: "Unable to determine division for selected district" },
        { status: 400 },
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // ─── Calculate totals ───
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.product_name?.trim() || !item.variant_size?.trim()) {
        return NextResponse.json(
          { error: "Product name and size are required for each item" },
          { status: 400 },
        );
      }

      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: "Valid quantity is required for each item" },
          { status: 400 },
        );
      }

      if (item.unit_price < 0) {
        return NextResponse.json(
          { error: "Valid unit price is required for each item" },
          { status: 400 },
        );
      }

      const totalPrice = item.unit_price * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        product_id: item.product_id || null, // Allow null for manual entries
        variant_id: item.variant_id || null,
        product_name: item.product_name.trim(),
        variant_size: item.variant_size.trim(),
        variant_color: item.variant_color || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price || 0,
        total_price: totalPrice,
        customization_note: item.customization_note || null,
      });
    }

    const { data: deliveryAreaRows } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", [DELIVERY_DHAKA_CITY_AREAS_KEY, DELIVERY_SUB_DHAKA_AREAS_KEY]);

    const deliveryAreaSettings = readDeliveryAreaSettings(
      Object.fromEntries(
        (deliveryAreaRows || []).map((row) => [row.key, row.value]),
      ),
    );
    const deliveryZone = resolveDeliveryZone({
      district: districtValue,
      area: areaValue,
      dhakaCityAreas: deliveryAreaSettings.dhakaCityAreas,
      subDhakaAreas: deliveryAreaSettings.subDhakaAreas,
    });

    // ─── Get delivery charge ───
    const { data: deliveryData } = await supabase
      .from("delivery_settings")
      .select("charge")
      .eq("zone", deliveryZone)
      .eq("is_active", true)
      .single();

    const fallbackCharges = {
      inside_dhaka: 60,
      sub_dhaka: 80,
      outside_dhaka: 120,
    } as const;
    const autoDeliveryCharge =
      deliveryData?.charge ?? fallbackCharges[deliveryZone];

    // Use admin override if provided, otherwise use auto-calculated zone charge
    const deliveryCharge =
      delivery_charge_override != null && delivery_charge_override >= 0
        ? Number(delivery_charge_override)
        : autoDeliveryCharge;

    const total = subtotal + deliveryCharge;

    // ─── Create order ───
    const orderNumber = generateOrderId();

    // Combine notes with payment details if payment is online
    let finalNotes = notes?.trim() || "";
    if (payment_method === "online" && payment_details?.trim()) {
      finalNotes = finalNotes
        ? `${finalNotes} | Payment: ${payment_details}`
        : `Payment: ${payment_details}`;
    }

    // Look up recommender name if provided
    let recommenderName = "";
    if (recommended_by_profile_id) {
      const { data: recommender } = await supabase
        .from("admin_profiles")
        .select("full_name")
        .eq("id", recommended_by_profile_id)
        .single();
      recommenderName = recommender?.full_name || "";
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        customer_email: customer_email || null,
        division: divisionValue,
        district: districtValue,
        area: areaValue,
        address: address.trim(),
        delivery_type: "home_delivery",
        payment_method,
        subtotal,
        delivery_charge: deliveryCharge,
        discount_amount: 0,
        total,
        status: "pending",
        notes: finalNotes || null,
        platform: platform || null,
        created_by_profile_id: profile.id,
        recommended_by_profile_id: recommended_by_profile_id || null,
        // Advance payment fields
        advance_payment_method:
          payment_method === "advance" ? (advance_payment_method || null) : null,
        advance_payment_amount:
          payment_method === "advance" ? (Number(advance_payment_amount) || 0) : 0,
        advance_payment_sender_phone:
          payment_method === "advance"
            ? (advance_payment_sender_phone?.trim() || null)
            : null,
        advance_payment_txn_id:
          payment_method === "advance"
            ? (advance_payment_txn_id?.trim() || null)
            : null,
        delivery_payment_status:
          payment_method === "advance"
            ? (delivery_payment_status || "pending")
            : "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 },
      );
    }

    // ─── Insert order items ───
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 },
      );
    }

    // ─── Insert initial status history ───
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "pending",
      note: `Order created by ${profile.full_name || profile.role}${recommenderName ? ` (Recommended by ${recommenderName})` : ""}`,
    });

    return NextResponse.json({
      order_id: order.id,
      order_number: orderNumber,
      total,
    });
  } catch (error) {
    console.error("Admin Order API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
