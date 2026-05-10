// ─── Courier Types ───

export type CourierProvider = "pathao" | "steadfast" | "manual";

export type CourierStatus =
  | "pending"
  | "picked"
  | "in_transit"
  | "in_review"
  | "delivered"
  | "partial_delivered"
  | "returned"
  | "hold"
  | "cancelled";

// ─── Pathao Types ───

export interface PathaoTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}

export interface PathaoCreateOrderPayload {
  store_id: number;
  merchant_order_id?: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: number; // 48 = Normal, 12 = On Demand
  item_type: number; // 2 = Parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
}

export interface PathaoOrderResponse {
  message: string;
  type: string;
  code: number;
  data: {
    consignment_id: string;
    merchant_order_id: string;
    order_status: string;
    delivery_fee: number;
  };
}

export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  city_id: number;
  zone_id: number;
  area_id: number;
  is_active: number;
}

// ─── Steadfast Types ───

export interface SteadfastCreateOrderPayload {
  invoice: string; // Unique, alphanumeric with hyphens/underscores
  recipient_name: string; // Max 100 chars
  recipient_phone: string; // 11 digits BD phone
  recipient_address: string; // Max 250 chars
  cod_amount: number; // Cash on delivery amount in BDT
  alternative_phone?: string;
  recipient_email?: string;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: number; // 0 = home delivery, 1 = point delivery
}

export interface SteadfastConsignment {
  consignment_id: number;
  invoice: string;
  tracking_code: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SteadfastOrderResponse {
  status: number;
  message: string;
  consignment: SteadfastConsignment;
}

export interface SteadfastStatusResponse {
  status: number;
  delivery_status: string;
}

export interface SteadfastBalanceResponse {
  status: number;
  current_balance: number;
}

export interface SteadfastPoliceStation {
  id: number;
  name: string;
  district_name: string;
}

// ─── Unified Shipment Types ───

export interface CreateShipmentRequest {
  provider: CourierProvider;
  order_id: string;
  // Recipient info
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  // Location - IDs for Pathao
  city_id?: number;
  zone_id?: number;
  area_id?: number;
  city_name?: string;
  zone_name?: string;
  area_name?: string;
  // Shipment details
  delivery_type: "standard" | "express";
  item_weight: number;
  amount_to_collect: number;
  item_quantity?: number;
  item_description?: string;
  special_instruction?: string;
}

export interface CreateShipmentResponse {
  success: boolean;
  provider: CourierProvider;
  tracking_number: string;
  consignment_id?: string; // Pathao specific
  delivery_fee?: number;
  message?: string;
  error?: string;
}

export interface CourierLog {
  id: string;
  order_id: string;
  provider: CourierProvider;
  action: string;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  status_code: number;
  error_message?: string;
  created_at: string;
}

// ─── Extended Order Type ───

export interface OrderWithCourier {
  courier_provider: CourierProvider | null;
  tracking_number: string | null;
  courier_status: CourierStatus | null;
  courier_response: Record<string, unknown> | null;
  shipped_at: string | null;
  courier_consignment_id: string | null;
}
