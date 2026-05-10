// ─── Role Types ───

export type AdminRole =
  | "admin"
  | "super_admin"
  | "manager"
  | "storeman"
  | "moderator";

// ─── Variant Options ───

export interface VariantType {
  name: string; // Display name (e.g., "Size", "Material", "Edition")
  key: string; // Unique key (e.g., "size", "material", "edition")
  values: string[]; // Available values
  required: boolean; // Whether this variant type is required
}

export interface VariantOptions {
  // New structure with custom variant types
  variant_types?: VariantType[];

  // Legacy structure (kept for backward compatibility)
  sizes?: string[];
  colors?: string[];
  size_label?: string;
  color_label?: string;
}

// ─── Core Entity Types for Evolution Gadget ───

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_header: boolean;
  variant_options: VariantOptions;
  created_at: string;
  updated_at: string;
  // For nested display
  parent?: Category;
  subcategories?: Category[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  team: string | null;
  league: string | null;
  season: string | null;
  brand: string | null;
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  sku: string | null;
  cost_price: number;
  sale_price: number;
  discount_price: number | null;
  discount_type?: "flat" | "percentage" | null;
  stock_quantity: number;
  is_active: boolean;
  attributes?: Record<string, string>; // Custom variant attributes (e.g., { "sleeve": "Half Sleeve" })
}

export type CourierProvider = "pathao" | "steadfast" | "manual";

export type CourierStatus =
  | "pending"
  | "picked"
  | "in_transit"
  | "delivered"
  | "partial_delivered"
  | "returned"
  | "hold"
  | "cancelled";

export type AdvancePaymentMethod = "bkash" | "nagad";
export type DeliveryPaymentStatus = "pending" | "paid" | "verified" | "rejected";
export type AdvancePaymentType = "delivery" | "half" | "full";

export interface Order {
  id: string;
  order_number: string;
  created_by_profile_id: string | null;
  recommended_by_profile_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  division: string;
  district: string;
  area: string | null;
  address: string;
  delivery_type: "home_delivery" | "store_pickup";
  payment_method: "cod" | "cash" | "online" | "advance";
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  platform: string | null;
  // Advance payment fields
  advance_payment_method: AdvancePaymentMethod | null;
  advance_payment_sender_phone: string | null;
  advance_payment_txn_id: string | null;
  delivery_payment_status: DeliveryPaymentStatus;
  advance_payment_amount: number;
  // Courier fields
  courier_provider: CourierProvider | null;
  tracking_number: string | null;
  courier_status: CourierStatus | null;
  courier_response: Record<string, unknown> | null;
  shipped_at: string | null;
  courier_consignment_id: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Joined data
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "canceled"
  | "returned";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_size: string;
  variant_color: string | null;
  variant_attributes?: Record<string, string> | null;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
  customization_note: string | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface DeliverySetting {
  id: string;
  zone: string; // "inside_dhaka" | "outside_dhaka" | "sub_dhaka"
  charge: number;
  estimated_days: string;
  is_active: boolean;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: AdminRole;
  sales_target: number;
  sales_target_metric: "amount" | "orders" | null;
  sales_target_type: "daily" | "weekly" | "monthly" | null;
  sales_target_start_date: string | null;
  sales_target_end_date: string | null;
  created_at: string;
}

// ─── Cart Types (client-side only) ───

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  image_url: string | null;
}

export interface CartState {
  items: CartItem[];
  addItem: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
  ) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

// ─── API / Form Types ───

export interface CheckoutFormData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  district: string;
  area: string;
  address: string;
  delivery_zone: "inside_dhaka" | "sub_dhaka" | "outside_dhaka";
  notes: string;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  team: string;
  league: string;
  season: string;
  brand: string;
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
}

export interface VariantFormData {
  size: string;
  color: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  discount_price: number | null;
  stock_quantity: number;
  is_active: boolean;
}

// ─── Banner Types ───

export interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  storage_path: string;
  link_url: string | null;
  alt_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BannerSettings {
  id: string;
  transition_seconds: number;
  updated_at: string;
}

export interface StoreSettings {
  customization_enabled: boolean;
  customization_price: number;
  whatsapp_number: string;
}

export interface PaymentSettings {
  payment_cod_enabled: boolean;
  payment_advance_enabled: boolean;
  payment_bkash_number: string;
  payment_nagad_number: string;
}

export interface FooterSettings {
  footer_phone: string;
  footer_email: string;
  footer_address: string;
  footer_facebook_url: string;
  footer_instagram_url: string;
  footer_brand_description: string;
  footer_google_maps_url: string;
}

export interface PolicyContent {
  policy_about_us: string;
  policy_shipping: string;
  policy_returns: string;
  policy_privacy: string;
  policy_terms: string;
}

// ─── POS Types ───

export interface POSSaleItem {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_size: string;
  variant_color: string | null;
  variant_attributes?: Record<string, string> | null;
  quantity: number;
  unit_price: number;
  image_url: string | null;
  customizations?: Array<{ name: string; number: string }>;
  item_discount?: number;
}

// ─── Analytics Types ───

export interface SalesSummary {
  period: string;
  order_count: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

export interface BestSellingProduct {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
}

// ─── Coupon Types ───

export type DiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discount_amount?: number;
}
