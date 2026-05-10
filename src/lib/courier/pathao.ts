import {
  PathaoTokenResponse,
  PathaoCity,
  PathaoZone,
  PathaoArea,
  PathaoCreateOrderPayload,
  PathaoOrderResponse,
  PathaoStore,
} from "./types";

const PATHAO_BASE_URL =
  process.env.PATHAO_BASE_URL || "https://api-hermes.pathao.com";
const PATHAO_CLIENT_ID = process.env.PATHAO_CLIENT_ID || "";
const PATHAO_CLIENT_SECRET = process.env.PATHAO_CLIENT_SECRET || "";
const PATHAO_USERNAME = process.env.PATHAO_USERNAME || "";
const PATHAO_PASSWORD = process.env.PATHAO_PASSWORD || "";

// Token cache
let tokenCache: {
  access_token: string;
  expires_at: number;
} | null = null;

/**
 * Get access token from Pathao
 * Uses cached token if still valid
 */
export async function getPathaoToken(): Promise<string> {
  // Return cached token if valid (with 5 min buffer)
  if (tokenCache && Date.now() < tokenCache.expires_at - 300000) {
    return tokenCache.access_token;
  }

  const response = await fetch(
    `${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: PATHAO_CLIENT_ID,
        client_secret: PATHAO_CLIENT_SECRET,
        username: PATHAO_USERNAME,
        password: PATHAO_PASSWORD,
        grant_type: "password",
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pathao auth failed: ${error}`);
  }

  const data: PathaoTokenResponse = await response.json();

  // Cache the token
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Get list of cities
 */
export async function getPathaoCities(): Promise<PathaoCity[]> {
  const token = await getPathaoToken();

  const response = await fetch(
    `${PATHAO_BASE_URL}/aladdin/api/v1/countries/1/city-list`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get cities: ${error}`);
  }

  const data = await response.json();
  return data.data.data as PathaoCity[];
}

/**
 * Get zones in a city
 */
export async function getPathaoZones(cityId: number): Promise<PathaoZone[]> {
  const token = await getPathaoToken();

  const response = await fetch(
    `${PATHAO_BASE_URL}/aladdin/api/v1/cities/${cityId}/zone-list`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get zones: ${error}`);
  }

  const data = await response.json();
  return data.data.data as PathaoZone[];
}

/**
 * Get areas in a zone
 */
export async function getPathaoAreas(zoneId: number): Promise<PathaoArea[]> {
  const token = await getPathaoToken();

  const response = await fetch(
    `${PATHAO_BASE_URL}/aladdin/api/v1/zones/${zoneId}/area-list`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get areas: ${error}`);
  }

  const data = await response.json();
  return data.data.data as PathaoArea[];
}

/**
 * Get merchant stores
 */
export async function getPathaoStores(): Promise<PathaoStore[]> {
  const token = await getPathaoToken();

  const response = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/stores`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get stores: ${error}`);
  }

  const data = await response.json();
  return data.data.data as PathaoStore[];
}

/**
 * Create an order/parcel with Pathao
 */
export async function createPathaoOrder(
  payload: PathaoCreateOrderPayload,
): Promise<PathaoOrderResponse> {
  const token = await getPathaoToken();

  const response = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Pathao order: ${error}`);
  }

  return response.json();
}

/**
 * Get order status by consignment ID
 */
export async function getPathaoOrderStatus(
  consignmentId: string,
): Promise<{ order_status: string; delivery_status: string }> {
  const token = await getPathaoToken();

  const response = await fetch(
    `${PATHAO_BASE_URL}/aladdin/api/v1/orders/${consignmentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get order status: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Calculate delivery price
 */
export async function getPathaoDeliveryPrice(params: {
  store_id: number;
  item_type: number;
  delivery_type: number;
  item_weight: number;
  recipient_city: number;
  recipient_zone: number;
}): Promise<{ price: number; discount: number; promo_discount: number }> {
  const token = await getPathaoToken();

  const response = await fetch(
    `${PATHAO_BASE_URL}/aladdin/api/v1/merchant/price-plan`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get price: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get customer order history by phone number
 * Note: This endpoint may not be available in standard Pathao API
 * Returns statistics about customer's delivery history
 */
export async function getPathaoCustomerHistory(phone: string): Promise<{
  total_orders: number;
  delivered: number;
  cancelled: number;
  returned: number;
} | null> {
  try {
    const token = await getPathaoToken();

    // Normalize phone number (remove +880, spaces, dashes)
    const normalizedPhone = phone.replace(/\D/g, "");

    // Try to query orders by recipient phone
    // Note: This endpoint may not exist in all Pathao API versions
    const response = await fetch(
      `${PATHAO_BASE_URL}/aladdin/api/v1/orders?recipient_phone=${normalizedPhone}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      // API doesn't support this feature or customer not found
      return null;
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // API returned non-JSON response (probably HTML error page)
      return null;
    }

    const data = await response.json();
    type PathaoHistoryOrder = { order_status?: string };
    const orders: PathaoHistoryOrder[] = data.data?.data || [];

    // Calculate statistics
    return {
      total_orders: orders.length,
      delivered: orders.filter((o) => o.order_status === "Delivered").length,
      cancelled: orders.filter((o) => o.order_status === "Cancelled").length,
      returned: orders.filter((o) => o.order_status === "Returned").length,
    };
  } catch (error) {
    // Feature not available in this API version - this is expected
    // Only log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.debug("Pathao customer history endpoint not available");
    }
    return null;
  }
}
