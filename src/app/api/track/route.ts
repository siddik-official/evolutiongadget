import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, validateBDPhone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: "Please enter an order number or phone number." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Detect if the query looks like an order number (VS-XXXX-XXXX pattern)
  const isOrderNumber = /^VS-/i.test(q);

  try {
    if (isOrderNumber) {
      // ─── Search by order number (exact, case-insensitive) ───
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, customer_name, customer_phone,
          division, district, area, address,
          delivery_type, payment_method,
          subtotal, delivery_charge, discount_amount, total,
          status, notes, created_at, updated_at,
          items:order_items(
            id, product_name, variant_size, variant_color,
            quantity, unit_price, total_price, customization_note
          ),
          status_history:order_status_history(
            id, status, note, changed_by, created_at
          )
        `,
        )
        .ilike("order_number", q)
        .single();

      if (error || !order) {
        return NextResponse.json(
          { error: "No order found with that order number." },
          { status: 404 },
        );
      }

      // Sort status history oldest → newest
      if (order.status_history) {
        order.status_history.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }

      return NextResponse.json({ orders: [order] });
    }

    // ─── Search by phone number ───
    const phone = normalizePhone(q);
    if (!validateBDPhone(phone)) {
      return NextResponse.json(
        {
          error:
            "Invalid input. Enter a valid order number (e.g. VS-ABC123-XY) or a Bangladeshi phone number.",
        },
        { status: 400 },
      );
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id, order_number, customer_name, customer_phone,
        division, district, area, address,
        delivery_type, payment_method,
        subtotal, delivery_charge, discount_amount, total,
        status, notes, created_at, updated_at,
        items:order_items(
          id, product_name, variant_size, variant_color,
          quantity, unit_price, total_price, customization_note
        ),
        status_history:order_status_history(
          id, status, note, changed_by, created_at
        )
      `,
      )
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Track order error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "No orders found for that phone number." },
        { status: 404 },
      );
    }

    // Sort each order's status history oldest → newest
    for (const order of orders) {
      if (order.status_history) {
        order.status_history.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
    }

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("Track order error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
