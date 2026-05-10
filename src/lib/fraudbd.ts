// OCS Fraud Checker API Integration
// API: https://fraudchecker.ocs-api.top/api/v3

const FRAUD_CHECKER_API_URL = "https://fraudchecker.ocs-api.top/api/v3";
const FRAUD_CHECKER_API_KEY =
  process.env.FRAUD_CHECKER_API_KEY ||
  "7rCWgQndb3JC7gm2MOT5bhNh98JipjXxM6fC7lsg";

export interface CourierData {
  status: boolean;
  message: string;
  data: {
    success: number;
    cancel: number;
    total: number;
    deliveredPercentage: number;
    returnPercentage: number;
  };
}

export interface FraudCheckerResponse {
  phone: string;
  status: "Safe" | "Warning" | "Fraud" | "Unknown";
  score: number;
  total_parcel: number;
  success_parcel: number;
  cancel_parcel: number;
  response: {
    steadfast?: CourierData;
    pathao?: CourierData;
    redx?: CourierData;
    carrybee?: CourierData;
  };
  source: string;
}

export interface CourierSummaryItem {
  name: string;
  available: boolean;
  message: string;
  total: number;
  success: number;
  cancel: number;
  deliveredPercentage: number;
  returnPercentage: number;
}

export interface TotalSummary {
  total: number;
  success: number;
  cancel: number;
  successRate: number;
  cancelRate: number;
}

export interface RiskAssessment {
  level: "low" | "medium" | "high" | "very_high" | "unknown";
  score: number;
  status: "Safe" | "Warning" | "Fraud" | "Unknown";
  allowCourierCreate: boolean;
  reasons: string[];
}

export interface FraudCheckerResult {
  available: boolean;
  error?: string;
  data?: {
    phone: string;
    summaries: {
      [key: string]: CourierSummaryItem;
    };
    totalSummary: TotalSummary;
    riskAssessment: RiskAssessment;
    source: string;
  };
}

/**
 * Check courier information for a phone number using OCS Fraud Checker API
 * This aggregates data from Steadfast, Pathao, Redx, and Carrybee
 */
export async function checkFraudBD(
  phoneNumber: string,
): Promise<FraudCheckerResult> {
  // Normalize phone number (remove non-digits, ensure Bangladesh format)
  const normalizedPhone = phoneNumber.replace(/\D/g, "");

  // Ensure phone number is valid (11 digits for Bangladesh)
  if (normalizedPhone.length !== 11) {
    return {
      available: false,
      error: "Invalid phone number format",
    };
  }

  try {
    const url = new URL(FRAUD_CHECKER_API_URL);
    url.searchParams.append("key", FRAUD_CHECKER_API_KEY);
    url.searchParams.append("phone", normalizedPhone);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Fraud Checker API error: ${response.status}`);
    }

    const result: FraudCheckerResponse = await response.json();

    // Transform the response
    const summaries: { [key: string]: CourierSummaryItem } = {};

    // Process each courier
    const couriers = ["steadfast", "pathao", "redx", "carrybee"] as const;
    for (const courier of couriers) {
      const data = result.response[courier];
      if (data) {
        summaries[courier] = {
          name: courier.charAt(0).toUpperCase() + courier.slice(1),
          available: data.status,
          message: data.message,
          total: data.data.total,
          success: data.data.success,
          cancel: data.data.cancel,
          deliveredPercentage: data.data.deliveredPercentage,
          returnPercentage: data.data.returnPercentage,
        };
      }
    }

    // Calculate success rate
    const successRate =
      result.total_parcel > 0
        ? (result.success_parcel / result.total_parcel) * 100
        : 0;
    const cancelRate =
      result.total_parcel > 0
        ? (result.cancel_parcel / result.total_parcel) * 100
        : 0;

    // Calculate risk assessment based on API response
    const riskAssessment = calculateRiskAssessment(result);

    return {
      available: true,
      data: {
        phone: result.phone,
        summaries,
        totalSummary: {
          total: result.total_parcel,
          success: result.success_parcel,
          cancel: result.cancel_parcel,
          successRate,
          cancelRate,
        },
        riskAssessment,
        source: result.source,
      },
    };
  } catch (error) {
    console.error("Fraud Checker API error:", error);
    return {
      available: false,
      error: error instanceof Error ? error.message : "Fraud Checker API error",
    };
  }
}

/**
 * Calculate risk assessment based on Fraud Checker data
 */
function calculateRiskAssessment(
  response: FraudCheckerResponse,
): RiskAssessment {
  const reasons: string[] = [];
  let level: "low" | "medium" | "high" | "very_high" | "unknown" = "unknown";

  // Use the API's score directly (inverted - higher is worse for risk)
  // API score: 100 = Safe, 0 = Risky
  const riskScore = 100 - response.score;

  // Determine level based on API status
  switch (response.status) {
    case "Safe":
      level = "low";
      if (response.total_parcel > 0) {
        reasons.push(`✅ Safe customer with ${response.score}% score`);
        reasons.push(
          `${response.success_parcel}/${response.total_parcel} parcels delivered successfully`,
        );
      } else {
        reasons.push("New customer - No delivery history");
      }
      break;
    case "Warning":
      level = "medium";
      reasons.push(`⚠️ Warning: Score ${response.score}%`);
      if (response.cancel_parcel > 0) {
        reasons.push(`${response.cancel_parcel} cancelled parcels detected`);
      }
      break;
    case "Fraud":
      level = response.score < 30 ? "very_high" : "high";
      reasons.push(`🚨 Fraud Alert: Score ${response.score}%`);
      if (response.cancel_parcel > 0) {
        const cancelRate =
          (response.cancel_parcel / response.total_parcel) * 100;
        reasons.push(`High cancel rate: ${cancelRate.toFixed(1)}%`);
      }
      break;
    default:
      level = "unknown";
      reasons.push("Unable to determine risk level");
  }

  // Add courier-specific insights
  for (const [courier, data] of Object.entries(response.response)) {
    if (data?.status && data.data.total > 0) {
      const courierName = courier.charAt(0).toUpperCase() + courier.slice(1);
      if (data.data.deliveredPercentage === 100) {
        reasons.push(
          `${courierName}: Perfect delivery record (${data.data.total} orders)`,
        );
      } else if (data.data.returnPercentage > 30) {
        reasons.push(
          `${courierName}: High return rate (${data.data.returnPercentage}%)`,
        );
      }
    }
  }

  return {
    level,
    score: riskScore,
    status: response.status,
    allowCourierCreate: level !== "very_high" && level !== "high",
    reasons: reasons.length > 0 ? reasons : ["No risk factors identified"],
  };
}
