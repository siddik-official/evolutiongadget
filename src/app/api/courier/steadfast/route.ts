import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSteadfastOrder,
  getSteadfastStatusByTrackingCode,
  getSteadfastBalance,
  getSteadfastPoliceStations,
  testSteadfastConnection,
  mapSteadfastStatus,
} from "@/lib/courier/steadfast";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "balance": {
        const balance = await getSteadfastBalance();
        return NextResponse.json(balance);
      }

      case "police_stations": {
        const stations = await getSteadfastPoliceStations();
        return NextResponse.json({ stations });
      }

      case "status": {
        const trackingCode = searchParams.get("tracking_code");
        if (!trackingCode) {
          return NextResponse.json(
            { error: "tracking_code is required" },
            { status: 400 },
          );
        }
        const status = await getSteadfastStatusByTrackingCode(trackingCode);
        return NextResponse.json(status);
      }

      case "test": {
        const result = await testSteadfastConnection();
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use: balance, police_stations, status, test",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Steadfast API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    const body = await request.json();

    switch (action) {
      case "create_order": {
        const { order_id, ...orderData } = body;

        // Create order with Steadfast
        const result = await createSteadfastOrder({
          invoice: order_id,
          recipient_name: orderData.recipient_name,
          recipient_phone: orderData.recipient_phone,
          recipient_address: orderData.recipient_address,
          cod_amount: orderData.amount_to_collect || 0,
          note: orderData.special_instruction,
          item_description: orderData.item_description,
          delivery_type: orderData.delivery_type === "express" ? 1 : 0,
        });

        if (result.status === 200 && result.consignment) {
          // Update order in database
          const supabase = await createClient();
          await supabase
            .from("orders")
            .update({
              courier_provider: "steadfast",
              tracking_number: result.consignment.tracking_code,
              courier_consignment_id: String(result.consignment.consignment_id),
              courier_status: mapSteadfastStatus(result.consignment.status),
              courier_response: result,
              shipped_at: new Date().toISOString(),
            })
            .eq("id", order_id);

          return NextResponse.json({
            success: true,
            provider: "steadfast",
            tracking_number: result.consignment.tracking_code,
            consignment_id: result.consignment.consignment_id,
            message: result.message,
          });
        }

        return NextResponse.json(
          { success: false, error: result.message || "Failed to create order" },
          { status: 400 },
        );
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: create_order" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Steadfast API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 },
    );
  }
}
