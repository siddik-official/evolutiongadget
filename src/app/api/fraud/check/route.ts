import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFraudBD } from "@/lib/fraudbd";
import {
  evaluateFraudRisk,
  calculateOrderStats,
  normalizeAddress,
  addressSimilarity,
  type OrderInput,
} from "@/lib/fraud-check";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      customerName,
      phone,
      address,
      codAmount,
      district,
      policeStation,
      orderId, // Optional: if checking existing order
    } = body;

    if (!phone || !address) {
      return NextResponse.json(
        { error: "Phone and address are required" },
        { status: 400 },
      );
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, "");

    // Step 1: Get customer's order history from database
    const { data: orders, error } = await supabase
      .from("orders")
      .select("status, created_at, address, customer_phone, total")
      .eq("customer_phone", normalizedPhone)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database query error:", error);
    }

    const orderHistory = orders || [];

    // Step 2: Calculate statistics
    const stats = calculateOrderStats(orderHistory);

    // Count orders with similar address in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const similarAddressCount = orderHistory.filter((o) => {
      const similarity = addressSimilarity(o.address, address);
      const orderDate = new Date(o.created_at);
      return similarity > 0.7 && orderDate > thirtyDaysAgo;
    }).length;

    // Step 3: Check if address matches police station (if provided)
    let addressMatchedPoliceStation: boolean | undefined = undefined;
    if (policeStation && district) {
      const addressLower = address.toLowerCase();
      const policeStationLower = policeStation.toLowerCase();
      addressMatchedPoliceStation =
        addressLower.includes(policeStationLower) ||
        addressLower.includes(district.toLowerCase());
    }

    // Step 4: Check FraudBD for courier history across all providers
    const fraudBDCheck = await checkFraudBD(normalizedPhone);

    // Step 5: Prepare input for local fraud evaluation
    const orderInput: OrderInput = {
      customerName: customerName || "",
      phone: normalizedPhone,
      address,
      codAmount: codAmount || 0,
      district,
      policeStation,
      isReturningCustomer: stats.isReturningCustomer,
      previousDeliveredOrders: stats.previousDeliveredOrders,
      previousCancelledOrders: stats.previousCancelledOrders,
      samePhoneOrderCount24h: stats.samePhoneOrderCount24h,
      sameAddressOrderCount30d: similarAddressCount,
      addressMatchedPoliceStation,
    };

    // Step 6: Evaluate fraud risk using local heuristics
    const fraudResult = evaluateFraudRisk(orderInput);

    // Step 7: Enhance with Fraud Checker data if available
    if (fraudBDCheck.available && fraudBDCheck.data) {
      const fbData = fraudBDCheck.data;

      // Add Fraud Checker assessment to reasons
      if (
        fbData.riskAssessment.status === "Fraud" ||
        fbData.riskAssessment.level === "very_high" ||
        fbData.riskAssessment.level === "high"
      ) {
        fraudResult.score += fbData.riskAssessment.score;
        fraudResult.reasons.unshift(
          `🚨 Fraud Alert: ${fbData.riskAssessment.status} (Risk Score: ${fbData.riskAssessment.score})`,
        );

        // Add specific reasons
        for (const reason of fbData.riskAssessment.reasons) {
          if (!reason.includes("No risk factors")) {
            fraudResult.reasons.push(`📊 ${reason}`);
          }
        }
      } else if (fbData.riskAssessment.status === "Warning") {
        fraudResult.score += Math.floor(fbData.riskAssessment.score / 2);
        fraudResult.reasons.push(
          `⚠️ Warning: Customer has some flags (Score: ${100 - fbData.riskAssessment.score}%)`,
        );
        for (const reason of fbData.riskAssessment.reasons) {
          if (!reason.includes("No risk factors")) {
            fraudResult.reasons.push(`📊 ${reason}`);
          }
        }
      } else if (
        fbData.riskAssessment.status === "Safe" &&
        fbData.totalSummary.total >= 3
      ) {
        // Good customer - reduce score
        fraudResult.score -= 15;
        if (fraudResult.score < 0) fraudResult.score = 0;
        fraudResult.reasons.push(
          `✅ Safe Customer: ${fbData.totalSummary.successRate.toFixed(0)}% delivery success (${fbData.totalSummary.total} orders)`,
        );
      }

      // Re-evaluate level with combined score
      if (fraudResult.score >= 50) fraudResult.level = "high";
      else if (fraudResult.score >= 25) fraudResult.level = "medium";
      else fraudResult.level = "low";

      fraudResult.allowCourierCreate = fraudResult.level !== "high";
    }

    // Step 8: Log fraud check for audit trail
    if (orderId) {
      try {
        await supabase.from("fraud_check_logs").insert({
          order_id: orderId,
          phone: normalizedPhone,
          address,
          fraud_score: fraudResult.score,
          fraud_level: fraudResult.level,
          reasons: fraudResult.reasons,
          allow_courier: fraudResult.allowCourierCreate,
          fraudbd_data: fraudBDCheck.available ? fraudBDCheck.data : null,
          checked_at: new Date().toISOString(),
        });
      } catch (logError) {
        // Silently fail logging - don't block the response
        console.error("Failed to log fraud check:", logError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...fraudResult,
        orderHistory: {
          total: orderHistory.length,
          delivered: stats.previousDeliveredOrders,
          cancelled: stats.previousCancelledOrders,
          recent24h: stats.samePhoneOrderCount24h,
        },
        fraudBD: fraudBDCheck.available
          ? {
              available: true,
              phone: fraudBDCheck.data?.phone,
              summaries: fraudBDCheck.data?.summaries,
              totalSummary: fraudBDCheck.data?.totalSummary,
              riskAssessment: fraudBDCheck.data?.riskAssessment,
              source: fraudBDCheck.data?.source,
            }
          : {
              available: false,
              error: fraudBDCheck.error,
            },
      },
    });
  } catch (error) {
    console.error("Fraud check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Fraud check failed",
      },
      { status: 500 },
    );
  }
}

// GET endpoint for simple fraud check by phone
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 },
    );
  }

  try {
    const normalizedPhone = phone.replace(/\D/g, "");

    // Get order history from local database
    const { data: orders } = await supabase
      .from("orders")
      .select("status, created_at, address, customer_phone, total")
      .eq("customer_phone", normalizedPhone)
      .order("created_at", { ascending: false });

    const orderHistory = orders || [];
    const stats = calculateOrderStats(orderHistory);

    // Check Fraud Checker for courier history
    const fraudBDCheck = await checkFraudBD(normalizedPhone);

    return NextResponse.json({
      success: true,
      data: {
        phone: normalizedPhone,
        isReturningCustomer: stats.isReturningCustomer,
        orderHistory: {
          total: orderHistory.length,
          delivered: stats.previousDeliveredOrders,
          cancelled: stats.previousCancelledOrders,
          recent24h: stats.samePhoneOrderCount24h,
        },
        fraudBD: fraudBDCheck.available
          ? {
              available: true,
              phone: fraudBDCheck.data?.phone,
              summaries: fraudBDCheck.data?.summaries,
              totalSummary: fraudBDCheck.data?.totalSummary,
              riskAssessment: fraudBDCheck.data?.riskAssessment,
              source: fraudBDCheck.data?.source,
            }
          : {
              available: false,
              error: fraudBDCheck.error,
            },
      },
    });
  } catch (error) {
    console.error("Fraud check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Fraud check failed",
      },
      { status: 500 },
    );
  }
}
