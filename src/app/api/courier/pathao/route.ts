import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPathaoCities,
  getPathaoZones,
  getPathaoAreas,
  getPathaoStores,
  createPathaoOrder,
  getPathaoDeliveryPrice,
} from "@/lib/courier/pathao";
import type { PathaoCreateOrderPayload } from "@/lib/courier/types";

// GET - Fetch cities, zones, areas, or stores
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const cityId = searchParams.get("city_id");
  const zoneId = searchParams.get("zone_id");

  try {
    switch (action) {
      case "cities":
        const cities = await getPathaoCities();
        return NextResponse.json({ data: cities });

      case "zones":
        if (!cityId) {
          return NextResponse.json(
            { error: "city_id required" },
            { status: 400 },
          );
        }
        const zones = await getPathaoZones(parseInt(cityId));
        return NextResponse.json({ data: zones });

      case "areas":
        if (!zoneId) {
          return NextResponse.json(
            { error: "zone_id required" },
            { status: 400 },
          );
        }
        const areas = await getPathaoAreas(parseInt(zoneId));
        return NextResponse.json({ data: areas });

      case "stores":
        const stores = await getPathaoStores();
        return NextResponse.json({ data: stores });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Pathao API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API error" },
      { status: 500 },
    );
  }
}

// POST - Create order or get price
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (action === "price") {
      const {
        store_id,
        item_type,
        delivery_type,
        item_weight,
        recipient_city,
        recipient_zone,
      } = body;
      const price = await getPathaoDeliveryPrice({
        store_id,
        item_type: item_type || 2, // Parcel
        delivery_type: delivery_type || 48, // Normal
        item_weight: item_weight || 0.5,
        recipient_city,
        recipient_zone,
      });
      return NextResponse.json({ data: price });
    }

    if (action === "create_order") {
      const payload: PathaoCreateOrderPayload = {
        store_id: body.store_id,
        merchant_order_id: body.merchant_order_id,
        sender_name: body.sender_name,
        sender_phone: body.sender_phone,
        recipient_name: body.recipient_name,
        recipient_phone: body.recipient_phone,
        recipient_address: body.recipient_address,
        recipient_city: body.recipient_city,
        recipient_zone: body.recipient_zone,
        recipient_area: body.recipient_area,
        delivery_type: body.delivery_type || 48, // Normal
        item_type: body.item_type || 2, // Parcel
        special_instruction: body.special_instruction,
        item_quantity: body.item_quantity || 1,
        item_weight: body.item_weight || 0.5,
        amount_to_collect: body.amount_to_collect,
        item_description: body.item_description,
      };

      const result = await createPathaoOrder(payload);

      // Log the API call
      await supabase.from("courier_logs").insert({
        order_id: body.order_id,
        provider: "pathao",
        action: "create_order",
        request_payload: payload,
        response_payload: result,
        status_code: result.code || 200,
      });

      // Update order with tracking info
      if (body.order_id && result.data?.consignment_id) {
        await supabase
          .from("orders")
          .update({
            courier_provider: "pathao",
            tracking_number: result.data.consignment_id,
            courier_consignment_id: result.data.consignment_id,
            courier_status: result.data.order_status,
            courier_response: result.data,
            shipped_at: new Date().toISOString(),
            status: "shipped",
          })
          .eq("id", body.order_id);

        // Add to status history
        await supabase.from("order_status_history").insert({
          order_id: body.order_id,
          status: "shipped",
          note: `Shipped via Pathao. Tracking: ${result.data.consignment_id}`,
        });
      }

      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Pathao API error:", error);

    // Log error
    if (body.order_id) {
      await supabase.from("courier_logs").insert({
        order_id: body.order_id,
        provider: "pathao",
        action: body.action,
        request_payload: body,
        response_payload: null,
        status_code: 500,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API error" },
      { status: 500 },
    );
  }
}
