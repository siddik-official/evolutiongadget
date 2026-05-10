// ─── Facebook Product Feed Types ───

/**
 * Represents a single item in the Facebook/Meta product feed.
 * Maps to Meta's required and optional product catalog fields.
 * @see https://www.facebook.com/business/help/120325381656392
 */
export interface ProductFeedItem {
  // Required fields
  id: string; // Unique ID: "{product_uuid}__{variant_uuid}"
  title: string; // Product name + variant info (≤150 chars)
  description: string; // Plain text, no HTML (≤5000 chars)
  availability: "in stock" | "out of stock" | "preorder";
  condition: "new" | "refurbished" | "used";
  price: string; // Format: "1590 BDT"
  link: string; // Absolute URL to product page
  image_link: string; // Absolute URL to primary image (≥600×600px)
  brand: string; // Defaults to "Evolution Gadget"

  // Optional fields
  sale_price?: string; // Format: "1290 BDT"
  additional_image_link?: string[]; // Up to 10 additional images
  item_group_id?: string; // Parent product UUID (groups variants)
  size?: string;
  color?: string;
  mpn?: string; // SKU as manufacturer part number
  gtin?: string;
  google_product_category?: string;
  product_type?: string; // Category breadcrumb
  custom_label_0?: string; // For custom audience segmentation
}

/**
 * Raw product shape from Supabase query with joined relations.
 */
export interface FeedProduct {
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
  category: FeedCategory | null;
  images: FeedImage[];
  variants: FeedVariant[];
}

export interface FeedCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
}

export interface FeedImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface FeedVariant {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  sku: string | null;
  cost_price: number;
  sale_price: number;
  discount_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  attributes?: Record<string, string>;
}

/**
 * Configuration for the feed generator.
 */
export interface FeedConfig {
  siteUrl: string;
  shopName: string;
  shopDescription: string;
  defaultBrand: string;
  defaultCurrency: string;
  defaultCondition: "new" | "refurbished" | "used";
}
