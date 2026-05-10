/**
 * Comprehensive Fraud Check System
 * Combines local heuristics with Steadfast API fraud checks
 */

export type OrderInput = {
  customerName: string;
  phone: string;
  address: string;
  codAmount: number;
  district?: string;
  policeStation?: string;
  ip?: string;
  isReturningCustomer?: boolean;
  previousDeliveredOrders?: number;
  previousCancelledOrders?: number;
  samePhoneOrderCount24h?: number;
  sameAddressOrderCount30d?: number;
  addressMatchedPoliceStation?: boolean;
};

export type FraudResult = {
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
  allowCourierCreate: boolean;
  steadfastCheck?: {
    available: boolean;
    fraudulent: boolean;
    reason?: string;
  };
};

/**
 * Evaluate fraud risk using local heuristics
 */
export function evaluateFraudRisk(order: OrderInput): FraudResult {
  let score = 0;
  const reasons: string[] = [];

  const cleanedAddress = order.address.trim().replace(/\s+/g, " ");
  const digitCount = (cleanedAddress.match(/\d/g) || []).length;

  // Address validation
  if (cleanedAddress.length < 18) {
    score += 20;
    reasons.push("Address is too short or vague");
  }

  if (!/[a-zA-Z\u0980-\u09FF]/.test(cleanedAddress)) {
    score += 15;
    reasons.push("Address looks malformed");
  }

  if (digitCount === 0) {
    score += 8;
    reasons.push("Address has no house/road/block reference");
  }

  // COD amount check
  if (order.codAmount >= 3000 && !order.isReturningCustomer) {
    score += 20;
    reasons.push("High COD for first-time customer");
  }

  // Order history checks
  if ((order.previousCancelledOrders ?? 0) >= 2) {
    score += 25;
    reasons.push("Customer has repeated cancelled orders");
  }

  // Frequency checks
  if ((order.samePhoneOrderCount24h ?? 0) >= 3) {
    score += 18;
    reasons.push("Too many orders from same phone in 24h");
  }

  if ((order.sameAddressOrderCount30d ?? 0) >= 4) {
    score += 15;
    reasons.push("Address appears unusually often");
  }

  // Police station validation
  if (order.addressMatchedPoliceStation === false) {
    score += 15;
    reasons.push("Address does not match selected police station");
  }

  // Positive indicators (reduce score)
  if ((order.previousDeliveredOrders ?? 0) >= 3) {
    score -= 15;
    reasons.push("✓ Customer has good delivery history");
  }

  // Ensure score is non-negative
  if (score < 0) score = 0;

  // Determine risk level
  let level: FraudResult["level"] = "low";
  if (score >= 50) level = "high";
  else if (score >= 25) level = "medium";

  return {
    score,
    level,
    reasons,
    allowCourierCreate: level !== "high",
  };
}

/**
 * Calculate statistics from database for fraud check
 */
export function calculateOrderStats(
  orders: Array<{
    status: string;
    created_at: string;
    address: string;
    customer_phone: string;
  }>,
): {
  isReturningCustomer: boolean;
  previousDeliveredOrders: number;
  previousCancelledOrders: number;
  samePhoneOrderCount24h: number;
  sameAddressOrderCount30d: number;
} {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const delivered = orders.filter((o) => o.status === "delivered").length;
  const cancelled = orders.filter(
    (o) => o.status === "canceled" || o.status === "cancelled",
  ).length;

  const recent24h = orders.filter(
    (o) => new Date(o.created_at) > oneDayAgo,
  ).length;

  // For address matching, we'll need the current address passed separately
  // This is a placeholder - implement in the API route
  const recent30d = orders.filter(
    (o) => new Date(o.created_at) > thirtyDaysAgo,
  ).length;

  return {
    isReturningCustomer: orders.length > 0,
    previousDeliveredOrders: delivered,
    previousCancelledOrders: cancelled,
    samePhoneOrderCount24h: recent24h,
    sameAddressOrderCount30d: recent30d,
  };
}

/**
 * Normalize address for comparison
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if address approximately matches
 */
export function addressSimilarity(addr1: string, addr2: string): number {
  const normalized1 = normalizeAddress(addr1);
  const normalized2 = normalizeAddress(addr2);

  if (normalized1 === normalized2) return 1.0;

  // Simple word overlap similarity
  const words1 = new Set(normalized1.split(" "));
  const words2 = new Set(normalized2.split(" "));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
