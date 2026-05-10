import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderId, formatPrice } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is manager or admin
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !profile ||
      !["admin", "super_admin", "manager"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      items,
      customer_name,
      customer_phone,
      payment_method,
      online_payment_details,
      customization_price = 0,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items in sale" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify stock & calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let customizationCharge = 0;
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

    for (const item of items) {
      const { data: variant } = await adminClient
        .from("product_variants")
        .select("*")
        .eq("id", item.variant_id)
        .single();

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

      // Use server-side price (security)
      const baseUnitPrice = variant.discount_price ?? variant.sale_price;

      // Apply item discount (from POS UI)
      const itemDiscount = Math.max(
        0,
        Math.min(item.item_discount || 0, baseUnitPrice),
      );
      const finalUnitPrice = baseUnitPrice - itemDiscount;
      const totalPrice = finalUnitPrice * item.quantity;

      subtotal += totalPrice;
      totalDiscount += itemDiscount * item.quantity;

      // Calculate customization charge
      if (item.customization_note && customization_price > 0) {
        // Count how many jerseys were customized (by splitting customization_note)
        const segments = item.customization_note.split(" | ").filter(Boolean);
        const customizedCount = segments.length || 1;

        // Apply customization discount
        const customizationDiscount = Math.max(
          0,
          Math.min(item.customization_discount || 0, customization_price),
        );
        const finalCustomizationPrice =
          customization_price - customizationDiscount;
        const itemCustomizationCharge =
          finalCustomizationPrice * customizedCount;

        customizationCharge += itemCustomizationCharge;
        totalDiscount += customizationDiscount * customizedCount;
      }

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_size: item.variant_size,
        variant_color: item.variant_color || null,
        variant_attributes: item.variant_attributes || null,
        quantity: item.quantity,
        unit_price: finalUnitPrice,
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
        source: "pos_order",
        note: "POS sale",
      });
    }

    const total = subtotal + customizationCharge;

    // Create POS order
    const orderNumber = generateOrderId();

    // Build payment info for notes
    let paymentInfo = payment_method || "cash";
    if (payment_method === "online" && online_payment_details) {
      paymentInfo = `online (${online_payment_details})`;
    }

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer_name?.trim() || "Walk-in Customer",
        customer_phone: customer_phone?.trim() || "",
        customer_email: null,
        division: "",
        district: "",
        area: null,
        address: "In-store purchase",
        delivery_type: "store_pickup",
        payment_method: payment_method || "cash",
        subtotal,
        delivery_charge: 0,
        discount_amount: totalDiscount,
        total,
        status: "delivered",
        notes: `POS sale by ${profile.role} | Payment: ${paymentInfo}${customizationCharge > 0 ? ` | Customization: ${formatPrice(customizationCharge)}` : ""}${totalDiscount > 0 ? ` | Discount: ${formatPrice(totalDiscount)}` : ""}`,
      })
      .select()
      .single();

    if (orderError) {
      console.error("POS order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 },
      );
    }

    // Insert order items
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    await adminClient.from("order_items").insert(itemsWithOrderId);

    // Decrease stock
    for (const item of items) {
      await adminClient.rpc("decrement_stock", {
        variant_id_input: item.variant_id,
        quantity_input: item.quantity,
      });
    }

    if (stockMovements.length > 0) {
      const historyRows = stockMovements.map((movement) => ({
        ...movement,
        note: `POS order ${orderNumber}`,
        reference_id: order.id,
        created_by: user.id,
      }));
      const { error: stockHistoryError } = await adminClient
        .from("inventory_stock_history")
        .insert(historyRows);
      if (stockHistoryError) {
        console.error("POS stock history insert error:", stockHistoryError);
      }
    }

    // Insert status history
    await adminClient.from("order_status_history").insert({
      order_id: order.id,
      status: "delivered",
      note: "In-store POS sale",
      changed_by: user.id,
    });

    return NextResponse.json({
      order_id: order.id,
      order_number: orderNumber,
      total,
    });
  } catch (error) {
    console.error("POS API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
