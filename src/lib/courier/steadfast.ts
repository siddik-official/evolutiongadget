/**
 * Steadfast Courier API Service
 * Auth: Api-Key + Secret-Key in headers
 */

import {
  SteadfastCreateOrderPayload,
  SteadfastOrderResponse,
  SteadfastStatusResponse,
  SteadfastBalanceResponse,
  SteadfastPoliceStation,
} from "./types";

const DEFAULT_STEADFAST_BASE_URL = "https://portal.packzy.com/api/v1";

type SteadfastConfig = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
};

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.includes("portal.steadfast.com.bd")) {
    return trimmed.replace("portal.steadfast.com.bd", "portal.packzy.com");
  }
  if (trimmed.includes("api.steadfast.com.bd")) {
    return trimmed.replace("api.steadfast.com.bd", "portal.packzy.com");
  }
  return trimmed;
}

// Get credentials + base URL from env or database settings
async function getSteadfastConfig(): Promise<SteadfastConfig> {
  // First try environment variables
  if (process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY) {
    return {
      apiKey: process.env.STEADFAST_API_KEY,
      secretKey: process.env.STEADFAST_SECRET_KEY,
      baseUrl: normalizeBaseUrl(
        process.env.STEADFAST_BASE_URL || DEFAULT_STEADFAST_BASE_URL,
      ),
    };
  }

  // Fall back to database settings
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: settings } = await supabase
    .from("courier_settings")
    .select("api_key, secret_key, base_url, is_enabled")
    .eq("provider", "steadfast")
    .eq("is_enabled", true)
    .maybeSingle();

  if (settings?.api_key && settings?.secret_key) {
    return {
      apiKey: settings.api_key,
      secretKey: settings.secret_key,
      baseUrl: normalizeBaseUrl(
        settings.base_url || DEFAULT_STEADFAST_BASE_URL,
      ),
    };
  }

  throw new Error("Steadfast credentials not configured");
}

// Make authenticated request to Steadfast API
async function steadfastRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const config = await getSteadfastConfig();

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Api-Key": config.apiKey,
      "Secret-Key": config.secretKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Steadfast API error: ${response.status}`);
  }

  return data;
}

/**
 * Create a single order/consignment
 */
export async function createSteadfastOrder(
  payload: SteadfastCreateOrderPayload,
): Promise<SteadfastOrderResponse> {
  return steadfastRequest<SteadfastOrderResponse>("/create_order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Create bulk orders (max 500)
 */
export async function createSteadfastBulkOrders(
  orders: SteadfastCreateOrderPayload[],
): Promise<
  Array<{
    invoice: string;
    recipient_name: string;
    consignment_id: number | null;
    tracking_code: string | null;
    status: "success" | "error";
  }>
> {
  if (orders.length > 500) {
    throw new Error("Maximum 500 orders allowed in bulk create");
  }

  return steadfastRequest("/create_order/bulk-order", {
    method: "POST",
    body: JSON.stringify({ data: JSON.stringify(orders) }),
  });
}

/**
 * Check delivery status by consignment ID
 */
export async function getSteadfastStatusByConsignmentId(
  consignmentId: number,
): Promise<SteadfastStatusResponse> {
  return steadfastRequest<SteadfastStatusResponse>(
    `/status_by_cid/${consignmentId}`,
  );
}

/**
 * Check delivery status by invoice
 */
export async function getSteadfastStatusByInvoice(
  invoice: string,
): Promise<SteadfastStatusResponse> {
  return steadfastRequest<SteadfastStatusResponse>(
    `/status_by_invoice/${encodeURIComponent(invoice)}`,
  );
}

/**
 * Check delivery status by tracking code
 */
export async function getSteadfastStatusByTrackingCode(
  trackingCode: string,
): Promise<SteadfastStatusResponse> {
  return steadfastRequest<SteadfastStatusResponse>(
    `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`,
  );
}

/**
 * Get current balance
 */
export async function getSteadfastBalance(): Promise<SteadfastBalanceResponse> {
  return steadfastRequest<SteadfastBalanceResponse>("/get_balance");
}

/**
 * Create a return request
 */
export async function createSteadfastReturnRequest(params: {
  consignment_id?: number;
  invoice?: string;
  tracking_code?: string;
  reason?: string;
}): Promise<{
  id: number;
  user_id: number;
  consignment_id: number;
  reason: string | null;
  status: "pending" | "approved" | "processing" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}> {
  return steadfastRequest("/create_return_request", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Get a single return request
 */
export async function getSteadfastReturnRequest(id: number) {
  return steadfastRequest(`/get_return_request/${id}`);
}

/**
 * Get all return requests
 */
export async function getSteadfastReturnRequests() {
  return steadfastRequest("/get_return_requests");
}

/**
 * Get payments list
 */
export async function getSteadfastPayments() {
  return steadfastRequest("/payments");
}

/**
 * Get single payment with consignments
 */
export async function getSteadfastPayment(paymentId: number) {
  return steadfastRequest(`/payments/${paymentId}`);
}

/**
 * Get police stations list
 */
export async function getSteadfastPoliceStations(): Promise<
  SteadfastPoliceStation[]
> {
  return steadfastRequest<SteadfastPoliceStation[]>("/police_stations");
}

/**
 * Map Steadfast status to internal courier status
 */
export function mapSteadfastStatus(
  status: string,
):
  | "pending"
  | "in_review"
  | "delivered"
  | "partial_delivered"
  | "cancelled"
  | "hold" {
  const statusMap: Record<string, ReturnType<typeof mapSteadfastStatus>> = {
    pending: "pending",
    in_review: "in_review",
    delivered: "delivered",
    delivered_approval_pending: "delivered",
    partial_delivered: "partial_delivered",
    partial_delivered_approval_pending: "partial_delivered",
    cancelled: "cancelled",
    cancelled_approval_pending: "cancelled",
    hold: "hold",
    unknown: "pending",
    unknown_approval_pending: "pending",
  };

  return statusMap[status] || "pending";
}

/**
 * Test Steadfast connection
 */
export async function testSteadfastConnection(): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const balance = await getSteadfastBalance();
    return {
      success: true,
      balance: balance.current_balance,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Check if phone/address is flagged as fraudulent by Steadfast
 * Uses Steadfast's fraud detection based on their delivery history
 */
export async function checkSteadfastFraud(params: {
  phone: string;
  address?: string;
}): Promise<{
  isFraudulent: boolean;
  reason?: string;
  deliveryHistory?: {
    total: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
} | null> {
  try {
    const normalizedPhone = params.phone.replace(/\D/g, "");

    // Steadfast doesn't have a direct fraud check API endpoint
    // But we can infer fraud risk from their order history if available
    // This would require checking past consignments with this phone/address

    // Note: This endpoint may not exist in standard Steadfast API
    // Keeping as placeholder for custom implementation or future API updates

    // For now, return null to indicate feature not available
    // You can implement custom logic here based on your Steadfast account features

    return null;

    /* Future implementation when API becomes available:
    const response = await steadfastRequest<any>(
      `/fraud-check?phone=${normalizedPhone}`,
    );

    return {
      isFraudulent: response.is_fraud || false,
      reason: response.reason,
      deliveryHistory: response.history ? {
        total: response.history.total_orders,
        delivered: response.history.delivered,
        cancelled: response.history.cancelled,
        returned: response.history.returned,
      } : undefined,
    };
    */
  } catch (error) {
    console.debug("Steadfast fraud check not available");
    return null;
  }
}

/**
 * Get customer order history by phone number
 * Note: This endpoint is NOT available in standard Steadfast API
 * This function is kept for potential future API enhancements
 * Returns statistics about customer's delivery history
 */
export async function getSteadfastCustomerHistory(phone: string): Promise<{
  total_orders: number;
  delivered: number;
  cancelled: number;
  returned: number;
} | null> {
  // NOTE: Steadfast API does not currently provide customer lookup by phone
  // This would require a custom endpoint or different API access level
  // Returning null to skip external API call and use internal data only
  return null;

  /* Keeping code below for future reference if API becomes available:
  
  try {
    const normalizedPhone = phone.replace(/\D/g, "");
    const response = await steadfastRequest<any>(
      `/orders?recipient_phone=${normalizedPhone}`,
    );
    const orders = response.data || [];

    return {
      total_orders: orders.length,
      delivered: orders.filter(
        (o: any) =>
          o.status === "delivered" ||
          o.status === "delivered_approval_pending",
      ).length,
      cancelled: orders.filter(
        (o: any) =>
          o.status === "cancelled" || o.status === "cancelled_approval_pending",
      ).length,
      returned: orders.filter((o: any) => o.status === "returned").length,
    };
  } catch (error) {
    console.warn("Steadfast customer history not available:", error);
    return null;
  }
  */
}
