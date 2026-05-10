import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderId, validateBDPhone, normalizePhone } from "@/lib/utils";
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
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      district,
      area,
      address,
      notes,
      items,
      coupon_code,
      // Advance payment fields
      payment_method,
      advance_payment_method,
      advance_payment_sender_phone,
      advance_payment_txn_id,
      advance_payment_amount,
    } = body;

    // ─── Validation ───
    if (!customer_name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const phone = normalizePhone(customer_phone || "");
    if (!validateBDPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 },
      );
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
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ─── Duplicate Order Check ───
    // Block if same phone + within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_phone", phone)
      .gte("created_at", fiveMinutesAgo)
      .limit(1);

    if (recentOrders && recentOrders.length > 0) {
      return NextResponse.json(
        {
          error:
            "You recently placed an order. Please wait a few minutes before ordering again.",
        },
        { status: 429 },
      );
    }

    // ─── Verify stock & calculate totals ───
    let subtotal = 0;
    const orderItems = [];
    const stockMovements: Array<{
      variant_id: string;
      product_id: string;
      movement_type: "sale";
      quantity_change: number;
      stock_before: number;
      stock_after: number;
      unit_cost_price: number;
      total_cost_impact: number;
      source: string;
      note: string;
    }> = [];

    const variantIds = Array.from(
      new Set(
        items
          .map((item: { variant_id?: string }) => item.variant_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const { data: variantsData, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .in("id", variantIds);

    if (variantsError) {
      return NextResponse.json(
        { error: "Failed to verify product stock" },
        { status: 500 },
      );
    }

    const variantMap = new Map(
      (variantsData || []).map((variant) => [variant.id, variant]),
    );

    for (const item of items) {
      const variant = variantMap.get(item.variant_id);

      if (!variant) {
        return NextResponse.json(
          { error: `Product variant not found` },
          { status: 400 },
        );
      }

      if (variant.stock_quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.product_name} (${item.variant_size}). Only ${variant.stock_quantity} available.`,
          },
          { status: 400 },
        );
      }

      const unitPrice = variant.discount_price ?? variant.sale_price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_size: item.variant_size,
        variant_color: item.variant_color || null,
        variant_attributes: item.variant_attributes || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        cost_price: variant.cost_price,
        total_price: totalPrice,
        customization_note: item.customization_note || null,
      });

      stockMovements.push({
        variant_id: item.variant_id,
        product_id: item.product_id,
        movement_type: "sale",
        quantity_change: -item.quantity,
        stock_before: variant.stock_quantity,
        stock_after: variant.stock_quantity - item.quantity,
        unit_cost_price: Number(variant.cost_price || 0),
        total_cost_impact: Number(variant.cost_price || 0) * item.quantity,
        source: "online_order",
        note: "Order placed",
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
    const deliveryCharge =
      deliveryData?.charge ?? fallbackCharges[deliveryZone];

    // ─── Customization charge (server-side verified) ───
    // Count individual jersey customizations: a single order_item row can have
    // multiple jerseys' notes joined by " | " (e.g. qty=2 → "Jersey 1: ... | Jersey 2: ...")
    const customizedCount = orderItems.reduce((total, item) => {
      if (!item.customization_note) return total;
      const segments = item.customization_note.split(" | ").filter(Boolean);
      return total + (segments.length || 1);
    }, 0);
    let customizationCharge = 0;
    if (customizedCount > 0) {
      const { data: custPriceSetting } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "customization_price")
        .single();
      customizationCharge =
        parseFloat(custPriceSetting?.value || "0") * customizedCount;
    }

    // ─── Coupon validation and discount ───
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.trim().toUpperCase())
        .single();

      if (coupon && coupon.is_active) {
        const now = new Date();
        const validFrom = coupon.valid_from
          ? new Date(coupon.valid_from)
          : null;
        const validUntil = coupon.valid_until
          ? new Date(coupon.valid_until)
          : null;

        const isValidDate =
          (!validFrom || validFrom <= now) &&
          (!validUntil || validUntil >= now);
        const isUnderLimit =
          coupon.usage_limit === null || coupon.used_count < coupon.usage_limit;
        const meetsMinOrder =
          !coupon.min_order_amount || subtotal >= coupon.min_order_amount;

        if (isValidDate && isUnderLimit && meetsMinOrder) {
          if (coupon.discount_type === "percentage") {
            discountAmount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discountAmount > coupon.max_discount) {
              discountAmount = coupon.max_discount;
            }
          } else {
            discountAmount = Math.min(coupon.discount_value, subtotal);
          }
          discountAmount = Math.round(discountAmount * 100) / 100;
          appliedCouponCode = coupon.code;

          // Increment used_count
          await supabase
            .from("coupons")
            .update({ used_count: coupon.used_count + 1 })
            .eq("id", coupon.id);
        }
      }
    }

    const total =
      subtotal + deliveryCharge + customizationCharge - discountAmount;

    // ─── Determine payment method and status ───
    const isAdvancePayment = payment_method === "advance";
    const deliveryPaymentStatus = isAdvancePayment ? "paid" : "pending";

    // ─── Create order ───
    const orderNumber = generateOrderId();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        customer_phone: phone,
        customer_email: customer_email || null,
        division: divisionValue,
        district: districtValue,
        area: areaValue,
        address: address.trim(),
        delivery_type: "home_delivery",
        payment_method: isAdvancePayment ? "advance" : "cod",
        subtotal,
        delivery_charge: deliveryCharge,
        discount_amount: discountAmount,
        coupon_code: appliedCouponCode,
        total,
        status: "pending",
        notes: notes || null,
        platform: null,
        // Advance payment fields
        advance_payment_method: isAdvancePayment
          ? advance_payment_method
          : null,
        advance_payment_sender_phone: isAdvancePayment
          ? advance_payment_sender_phone
          : null,
        advance_payment_txn_id: isAdvancePayment
          ? advance_payment_txn_id
          : null,
        advance_payment_amount: isAdvancePayment
          ? advance_payment_amount || 0
          : 0,
        delivery_payment_status: deliveryPaymentStatus,
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
    }

    // ─── Decrease stock ───
    const quantityByVariant = new Map<string, number>();
    for (const item of items) {
      const existingQty = quantityByVariant.get(item.variant_id) || 0;
      quantityByVariant.set(item.variant_id, existingQty + item.quantity);
    }

    const stockUpdateResults = await Promise.allSettled(
      Array.from(quantityByVariant.entries()).map(([variantId, quantity]) =>
        supabase.rpc("decrement_stock", {
          variant_id_input: variantId,
          quantity_input: quantity,
        }),
      ),
    );

    const failedStockUpdates = stockUpdateResults.filter(
      (result) => result.status === "rejected",
    );

    if (failedStockUpdates.length > 0) {
      console.error("Stock decrement failures:", failedStockUpdates);
    }

    if (stockMovements.length > 0) {
      const historyRows = stockMovements.map((movement) => ({
        ...movement,
        note: `Order ${orderNumber}`,
        reference_id: order.id,
      }));
      const { error: stockHistoryError } = await supabase
        .from("inventory_stock_history")
        .insert(historyRows);

      if (stockHistoryError) {
        console.error("Stock history insert error:", stockHistoryError);
      }
    }

    // ─── Insert initial status history ───
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "pending",
      note: "Order placed",
    });

    return NextResponse.json({
      order_id: order.id,
      order_number: orderNumber,
      total,
    });
  } catch (error) {
    console.error("Order API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
