import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pathao webhook event types
const PATHAO_EVENTS = {
  ORDER_CREATED: "Order Created",
  ORDER_UPDATED: "Order Updated",
  PICKUP_REQUESTED: "Pickup Requested",
  ASSIGNED_FOR_PICKUP: "Assigned For Pickup",
  PICKUP: "Pickup",
  PICKUP_FAILED: "Pickup Failed",
  PICKUP_CANCELLED: "Pickup Cancelled",
  AT_SORTING_HUB: "At the Sorting Hub",
  IN_TRANSIT: "In Transit",
  RECEIVED_AT_LAST_MILE_HUB: "Received at Last Mile Hub",
  ASSIGNED_FOR_DELIVERY: "Assigned for Delivery",
  DELIVERED: "Delivered",
  PARTIAL_DELIVERY: "Partial Delivery",
  RETURN: "Return",
  DELIVERY_FAILED: "Delivery Failed",
  ON_HOLD: "On Hold",
  PAYMENT_INVOICE: "Payment Invoice",
  PAID_RETURN: "Paid Return",
  EXCHANGE: "Exchange",
  STORE_CREATED: "Store Created",
  STORE_UPDATED: "Store Updated",
};

// Map Pathao status to our order status
const STATUS_MAP: Record<string, string> = {
  "Order Created": "processing",
  Pickup: "shipped",
  "In Transit": "shipped",
  "Assigned for Delivery": "shipped",
  Delivered: "delivered",
  "Partial Delivery": "delivered",
  Return: "returned",
  "Delivery Failed": "shipped",
  "On Hold": "processing",
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify webhook signature
  const signature = request.headers.get("X-PATHAO-Signature");
  const webhookSecret = process.env.PATHAO_WEBHOOK_SECRET;

  // In production, verify the signature
  // For now, we'll process all requests but log the signature check
  if (webhookSecret && signature) {
    // TODO: Implement HMAC signature verification
    console.log("Webhook signature received:", signature);
  }

  try {
    const payload = await request.json();

    const {
      consignment_id,
      order_status,
      merchant_order_id,
      delivery_fee,
      cod_fee,
      promo_discount,
      discount,
      additional_charge,
    } = payload;

    // Log the webhook event
    const { data: webhookLog, error: logError } = await supabase
      .from("courier_webhook_events")
      .insert({
        provider: "pathao",
        event_type: order_status,
        consignment_id,
        payload,
        processed: false,
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to log webhook:", logError);
    }

    // Find the order by tracking number or merchant_order_id
    let orderQuery = supabase.from("orders").select("id, status");

    if (consignment_id) {
      orderQuery = orderQuery.eq("tracking_number", consignment_id);
    } else if (merchant_order_id) {
      orderQuery = orderQuery.eq("order_number", merchant_order_id);
    } else {
      return NextResponse.json(
        { error: "No order identifier provided" },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      // Update webhook log with error
      if (webhookLog) {
        await supabase
          .from("courier_webhook_events")
          .update({
            error_message: "Order not found",
            processed: true,
          })
          .eq("id", webhookLog.id);
      }

      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update webhook log with order_id
    if (webhookLog) {
      await supabase
        .from("courier_webhook_events")
        .update({ order_id: order.id })
        .eq("id", webhookLog.id);
    }

    // Map Pathao status to our status
    const newStatus = STATUS_MAP[order_status] || order.status;

    // Update order with courier status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        courier_status: order_status,
        courier_response: {
          ...payload,
          last_updated: new Date().toISOString(),
        },
        status: newStatus,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order:", updateError);

      if (webhookLog) {
        await supabase
          .from("courier_webhook_events")
          .update({
            error_message: updateError.message,
            processed: true,
          })
          .eq("id", webhookLog.id);
      }

      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 },
      );
    }

    // Add to status history if status changed
    if (newStatus !== order.status) {
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: newStatus,
        note: `Pathao: ${order_status}`,
      });
    }

    // Mark webhook as processed
    if (webhookLog) {
      await supabase
        .from("courier_webhook_events")
        .update({ processed: true })
        .eq("id", webhookLog.id);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      order_id: order.id,
      new_status: newStatus,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}

// GET - Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    provider: "pathao",
    events: Object.values(PATHAO_EVENTS),
  });
}
