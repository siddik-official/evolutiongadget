import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPathaoCustomerHistory } from "@/lib/courier/pathao";
import { getSteadfastCustomerHistory } from "@/lib/courier/steadfast";

interface FraudCheckResult {
  phone: string;
  total_orders: number;
  delivered: number;
  cancelled: number;
  returned: number;
  fraud_reports: number;
  delivery_rate: number;
  risk_level: "low" | "medium" | "high";
  providers: {
    pathao?: { orders: number; delivered: number; cancelled: number };
    steadfast?: { orders: number; delivered: number; cancelled: number };
    internal?: { orders: number; delivered: number; cancelled: number };
  };
}

// Check fraud risk from internal orders
async function checkInternalFraud(
  phone: string,
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("status, courier_provider")
    .eq("customer_phone", phone);

  if (error || !orders) {
    return {
      internal: { orders: 0, delivered: 0, cancelled: 0, returned: 0 },
      pathao: { orders: 0, delivered: 0, cancelled: 0, returned: 0 },
      steadfast: { orders: 0, delivered: 0, cancelled: 0, returned: 0 },
    };
  }

  // Separate orders by provider
  const internalOrders = orders.filter(
    (o) => !o.courier_provider || o.courier_provider === "manual",
  );
  const pathaoOrders = orders.filter((o) => o.courier_provider === "pathao");
  const steadfastOrders = orders.filter(
    (o) => o.courier_provider === "steadfast",
  );

  const calculateStats = (orderList: typeof orders) => ({
    orders: orderList.length,
    delivered: orderList.filter((o) => o.status === "delivered").length,
    cancelled: orderList.filter((o) => o.status === "canceled").length,
    returned: orderList.filter((o) => o.status === "returned").length,
  });

  return {
    internal: calculateStats(internalOrders),
    pathao: calculateStats(pathaoOrders),
    steadfast: calculateStats(steadfastOrders),
  };
}

// Calculate risk level based on metrics
function calculateRiskLevel(stats: {
  total_orders: number;
  delivered: number;
  cancelled: number;
  returned: number;
}): "low" | "medium" | "high" {
  if (stats.total_orders === 0) return "low"; // New customer

  const deliveryRate = (stats.delivered / stats.total_orders) * 100;
  const cancelRate =
    ((stats.cancelled + stats.returned) / stats.total_orders) * 100;

  if (cancelRate > 50 || stats.returned > 2) return "high";
  if (cancelRate > 25 || deliveryRate < 70) return "medium";
  return "low";
}

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
  const includeExternal = searchParams.get("include_external") !== "false"; // Default true

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 },
    );
  }

  // Normalize phone number
  const normalizedPhone = phone.replace(/\D/g, "");

  try {
    // Check internal orders (separated by provider)
    const internalStats = await checkInternalFraud(normalizedPhone, supabase);

    const providers: FraudCheckResult["providers"] = {
      internal: internalStats.internal,
    };

    // Try to get external API data if requested
    if (includeExternal) {
      // Pathao external API (if available)
      const pathaoExternal = await getPathaoCustomerHistory(normalizedPhone);
      if (pathaoExternal) {
        // Merge with internal Pathao orders
        providers.pathao = {
          orders:
            internalStats.pathao.orders + pathaoExternal.total_orders,
          delivered:
            internalStats.pathao.delivered + pathaoExternal.delivered,
          cancelled:
            internalStats.pathao.cancelled + pathaoExternal.cancelled,
        };
      } else if (internalStats.pathao.orders > 0) {
        providers.pathao = internalStats.pathao;
      }

      // Steadfast external API (if available)
      const steadfastExternal =
        await getSteadfastCustomerHistory(normalizedPhone);
      if (steadfastExternal) {
        // Merge with internal Steadfast orders
        providers.steadfast = {
          orders:
            internalStats.steadfast.orders +
            steadfastExternal.total_orders,
          delivered:
            internalStats.steadfast.delivered +
            steadfastExternal.delivered,
          cancelled:
            internalStats.steadfast.cancelled +
            steadfastExternal.cancelled,
        };
      } else if (internalStats.steadfast.orders > 0) {
        providers.steadfast = internalStats.steadfast;
      }
    } else {
      // Only use internal data
      if (internalStats.pathao.orders > 0) {
        providers.pathao = internalStats.pathao;
      }
      if (internalStats.steadfast.orders > 0) {
        providers.steadfast = internalStats.steadfast;
      }
    }

    // Calculate total stats across all providers
    const totalStats = {
      total_orders: Object.values(providers).reduce(
        (sum, p) => sum + (p?.orders || 0),
        0,
      ),
      delivered: Object.values(providers).reduce(
        (sum, p) => sum + (p?.delivered || 0),
        0,
      ),
      cancelled: Object.values(providers).reduce(
        (sum, p) => sum + (p?.cancelled || 0),
        0,
      ),
      returned:
        internalStats.internal.returned +
        internalStats.pathao.returned +
        internalStats.steadfast.returned,
      fraud_reports: 0,
    };

    const deliveryRate =
      totalStats.total_orders > 0
        ? Math.round((totalStats.delivered / totalStats.total_orders) * 10000) /
          100
        : 100;

    const result: FraudCheckResult = {
      phone: normalizedPhone,
      ...totalStats,
      delivery_rate: deliveryRate,
      risk_level: calculateRiskLevel(totalStats),
      providers,
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Fraud check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fraud check failed" },
      { status: 500 },
    );
  }
}

// POST - Check fraud with optional external providers
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { phone, include_external = true } = body;

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 },
    );
  }

  const normalizedPhone = phone.replace(/\D/g, "");

  try {
    // Get internal stats separated by provider
    const internalStats = await checkInternalFraud(normalizedPhone, supabase);

    const providers: FraudCheckResult["providers"] = {
      internal: internalStats.internal,
    };

    // Try external APIs if requested
    if (include_external) {
      // Pathao
      const pathaoExternal = await getPathaoCustomerHistory(normalizedPhone);
      if (pathaoExternal) {
        providers.pathao = {
          orders:
            internalStats.pathao.orders + pathaoExternal.total_orders,
          delivered:
            internalStats.pathao.delivered + pathaoExternal.delivered,
          cancelled:
            internalStats.pathao.cancelled + pathaoExternal.cancelled,
        };
      } else if (internalStats.pathao.orders > 0) {
        providers.pathao = internalStats.pathao;
      }

      // Steadfast
      const steadfastExternal =
        await getSteadfastCustomerHistory(normalizedPhone);
      if (steadfastExternal) {
        providers.steadfast = {
          orders:
            internalStats.steadfast.orders +
            steadfastExternal.total_orders,
          delivered:
            internalStats.steadfast.delivered +
            steadfastExternal.delivered,
          cancelled:
            internalStats.steadfast.cancelled +
            steadfastExternal.cancelled,
        };
      } else if (internalStats.steadfast.orders > 0) {
        providers.steadfast = internalStats.steadfast;
      }
    } else {
      // Only internal data
      if (internalStats.pathao.orders > 0) {
        providers.pathao = internalStats.pathao;
      }
      if (internalStats.steadfast.orders > 0) {
        providers.steadfast = internalStats.steadfast;
      }
    }

    // Calculate totals
    const totalStats = {
      total_orders: Object.values(providers).reduce(
        (sum, p) => sum + (p?.orders || 0),
        0,
      ),
      delivered: Object.values(providers).reduce(
        (sum, p) => sum + (p?.delivered || 0),
        0,
      ),
      cancelled: Object.values(providers).reduce(
        (sum, p) => sum + (p?.cancelled || 0),
        0,
      ),
      returned:
        internalStats.internal.returned +
        internalStats.pathao.returned +
        internalStats.steadfast.returned,
      fraud_reports: 0,
    };

    const deliveryRate =
      totalStats.total_orders > 0
        ? Math.round((totalStats.delivered / totalStats.total_orders) * 10000) /
          100
        : 100;

    const result: FraudCheckResult = {
      phone: normalizedPhone,
      ...totalStats,
      delivery_rate: deliveryRate,
      risk_level: calculateRiskLevel(totalStats),
      providers,
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Fraud check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fraud check failed" },
      { status: 500 },
    );
  }
}
