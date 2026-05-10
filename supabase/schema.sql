-- ============================================================
-- Evolution Gadget — Complete Database Schema for Supabase
-- Idempotent. Safe to re-run.
-- ORDER OF OPERATIONS:
--   1. Run this file in Supabase SQL Editor on a fresh project.
--   2. Then run setup-admin.sql to create the super-admin user.
-- ============================================================

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── updated_at trigger function ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLES
-- ============================================================

-- ─── Categories ───
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_in_header BOOLEAN DEFAULT true,
  variant_options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Admin Profiles ───
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin','super_admin','manager','storeman','moderator')),
  sales_target NUMERIC(12,2) DEFAULT 0,
  sales_target_metric TEXT CHECK (sales_target_metric IN ('amount','orders')),
  sales_target_type   TEXT CHECK (sales_target_type   IN ('daily','weekly','monthly')),
  sales_target_start_date DATE,
  sales_target_end_date   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Products ───
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  team TEXT,
  league TEXT,
  season TEXT,
  brand TEXT,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Product Images ───
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false
);

-- ─── Product Variants ───
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT,
  sku TEXT UNIQUE,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(10,2),
  discount_type TEXT CHECK (discount_type IN ('flat','percentage')) DEFAULT 'flat',
  stock_quantity INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  attributes JSONB DEFAULT '{}'::jsonb
);

-- ─── Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  created_by_profile_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  recommended_by_profile_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  division TEXT NOT NULL,
  district TEXT NOT NULL,
  area TEXT,
  address TEXT NOT NULL,
  delivery_type TEXT NOT NULL DEFAULT 'home_delivery',
  payment_method TEXT NOT NULL DEFAULT 'cod',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  platform TEXT DEFAULT 'cell_phone',
  coupon_code TEXT,
  -- Advance payment
  advance_payment_method TEXT CHECK (advance_payment_method IN ('bkash','nagad')),
  advance_payment_sender_phone TEXT,
  advance_payment_txn_id TEXT,
  delivery_payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_payment_status IN ('pending','paid','verified','rejected')),
  advance_payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Courier
  courier_provider TEXT,
  tracking_number TEXT,
  courier_status TEXT,
  courier_response JSONB,
  shipped_at TIMESTAMPTZ,
  courier_consignment_id TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Order Items ───
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  product_name TEXT NOT NULL,
  variant_size TEXT NOT NULL,
  variant_color TEXT,
  variant_attributes JSONB,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,
  customization_note TEXT
);

-- ─── Order Status History ───
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Delivery Settings ───
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone TEXT NOT NULL UNIQUE,
  charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_days TEXT,
  is_active BOOLEAN DEFAULT true
);

-- ─── Banners ───
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  link_url TEXT,
  alt_text TEXT,
  is_active BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transition_seconds INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Coupons ───
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Inventory Stock History ───
CREATE TABLE IF NOT EXISTS inventory_stock_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'initial_stock','restock','sale','return',
    'manual_adjustment_in','manual_adjustment_out'
  )),
  quantity_change INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  unit_cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost_impact NUMERIC(10,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'system',
  reference_id UUID,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Courier Logs ───
CREATE TABLE IF NOT EXISTS courier_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Courier Settings ───
CREATE TABLE IF NOT EXISTS courier_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  is_sandbox BOOLEAN DEFAULT true,
  base_url TEXT,
  client_id TEXT,
  client_secret TEXT,
  username TEXT,
  password TEXT,
  default_store_id TEXT,
  webhook_secret TEXT,
  api_key TEXT,
  secret_key TEXT,
  default_weight NUMERIC(5,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Courier Webhook Events ───
CREATE TABLE IF NOT EXISTS courier_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  consignment_id TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Store Settings (key/value) ───
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_categories_slug         ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent       ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active       ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug           ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active         ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured       ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at     ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_variants_product        ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_attributes     ON product_variants USING GIN (attributes);

CREATE INDEX IF NOT EXISTS idx_orders_phone            ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_number           ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created          ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking         ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_courier          ON orders(courier_provider);

CREATE INDEX IF NOT EXISTS idx_order_items_order       ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_attributes  ON order_items USING GIN (variant_attributes);

CREATE INDEX IF NOT EXISTS idx_banners_active          ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_sort            ON banners(sort_order);

CREATE INDEX IF NOT EXISTS idx_coupons_code            ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active          ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_public          ON coupons(is_public);
CREATE INDEX IF NOT EXISTS idx_coupons_valid           ON coupons(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_stock_history_variant     ON inventory_stock_history(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_product     ON inventory_stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at  ON inventory_stock_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courier_logs_order      ON courier_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_courier_logs_provider   ON courier_logs(provider);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order        ON courier_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_consignment  ON courier_webhook_events(consignment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed    ON courier_webhook_events(processed);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_user     ON admin_profiles(user_id);


-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS banners_updated_at ON banners;
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS courier_settings_updated_at ON courier_settings;
CREATE TRIGGER courier_settings_updated_at BEFORE UPDATE ON courier_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Atomic stock decrement (won't go below zero)
CREATE OR REPLACE FUNCTION decrement_stock(variant_id_input UUID, quantity_input INT)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock_quantity = stock_quantity - quantity_input
  WHERE id = variant_id_input AND stock_quantity >= quantity_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners                ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings         ENABLE ROW LEVEL SECURITY;

-- Public reads (storefront)
DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read images" ON product_images;
CREATE POLICY "Public read images" ON product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read variants" ON product_variants;
CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read delivery" ON delivery_settings;
CREATE POLICY "Public read delivery" ON delivery_settings FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active banners" ON banners;
CREATE POLICY "Public read active banners" ON banners FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read banner settings" ON banner_settings;
CREATE POLICY "Public read banner settings" ON banner_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read public coupons" ON coupons;
CREATE POLICY "Public read public coupons" ON coupons
  FOR SELECT USING (is_active = true AND is_public = true);

DROP POLICY IF EXISTS "Public read store_settings" ON store_settings;
CREATE POLICY "Public read store_settings" ON store_settings FOR SELECT USING (true);

-- Guest checkout
DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert order items" ON order_items;
CREATE POLICY "Public insert order items" ON order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert status history" ON order_status_history;
CREATE POLICY "Public insert status history" ON order_status_history FOR INSERT WITH CHECK (true);

-- Admin full-access policies
DROP POLICY IF EXISTS "Admin full access categories" ON categories;
CREATE POLICY "Admin full access categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access products" ON products;
CREATE POLICY "Admin full access products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access images" ON product_images;
CREATE POLICY "Admin full access images" ON product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access variants" ON product_variants;
CREATE POLICY "Admin full access variants" ON product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access orders" ON orders;
CREATE POLICY "Admin full access orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access order items" ON order_items;
CREATE POLICY "Admin full access order items" ON order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access status history" ON order_status_history;
CREATE POLICY "Admin full access status history" ON order_status_history FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access delivery" ON delivery_settings;
CREATE POLICY "Admin full access delivery" ON delivery_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin read profiles" ON admin_profiles;
CREATE POLICY "Admin read profiles" ON admin_profiles FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_profiles ap
    WHERE ap.user_id = auth.uid() AND ap.role IN ('admin','super_admin')
  )
);

DROP POLICY IF EXISTS "Admin manage profiles" ON admin_profiles;
CREATE POLICY "Admin manage profiles" ON admin_profiles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_profiles ap
    WHERE ap.user_id = auth.uid() AND ap.role IN ('admin','super_admin')
  )
);

DROP POLICY IF EXISTS "Admin full access banners" ON banners;
CREATE POLICY "Admin full access banners" ON banners FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access banner settings" ON banner_settings;
CREATE POLICY "Admin full access banner settings" ON banner_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access coupons" ON coupons;
CREATE POLICY "Admin full access coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access inventory" ON inventory_stock_history;
CREATE POLICY "Admin full access inventory" ON inventory_stock_history FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access courier_logs" ON courier_logs;
CREATE POLICY "Admin full access courier_logs" ON courier_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access courier_settings" ON courier_settings;
CREATE POLICY "Admin full access courier_settings" ON courier_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin full access webhook_events" ON courier_webhook_events;
CREATE POLICY "Admin full access webhook_events" ON courier_webhook_events FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated manage store_settings" ON store_settings;
CREATE POLICY "Authenticated manage store_settings" ON store_settings
  FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners', 'banners', true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
CREATE POLICY "Authenticated can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
CREATE POLICY "Authenticated can update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;
CREATE POLICY "Authenticated can delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can view banner images" ON storage.objects;
CREATE POLICY "Public can view banner images" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Authenticated can upload banner images" ON storage.objects;
CREATE POLICY "Authenticated can upload banner images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update banner images" ON storage.objects;
CREATE POLICY "Authenticated can update banner images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'banners' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete banner images" ON storage.objects;
CREATE POLICY "Authenticated can delete banner images" ON storage.objects
  FOR DELETE USING (bucket_id = 'banners' AND auth.role() = 'authenticated');


-- ============================================================
-- SEED DATA
-- ============================================================

-- Delivery zones
INSERT INTO delivery_settings (zone, charge, estimated_days, is_active) VALUES
  ('inside_dhaka',   60, '1-2 days', true),
  ('sub_dhaka',      80, '1-3 days', true),
  ('outside_dhaka', 120, '2-4 days', true)
ON CONFLICT (zone) DO NOTHING;

-- Banner settings (single row)
INSERT INTO banner_settings (transition_seconds)
SELECT 5 WHERE NOT EXISTS (SELECT 1 FROM banner_settings);

-- Courier settings (placeholders, disabled)
INSERT INTO courier_settings (provider, is_enabled, is_sandbox, base_url) VALUES
  ('pathao',    false, true, 'https://courier-api-sandbox.pathao.com'),
  ('steadfast', false, true, 'https://portal.packzy.com/api/v1')
ON CONFLICT (provider) DO NOTHING;

-- Store settings (Evolution Gadget defaults)
INSERT INTO store_settings (key, value) VALUES
  -- Customization
  ('customization_enabled',                    'false'),
  ('customization_price',                      '0'),
  ('customization_option_paid_enabled',        'true'),
  ('customization_option_whatsapp_enabled',    'false'),
  ('customization_whatsapp_text',              'Contact us on WhatsApp for product customization'),
  ('customization_whatsapp_number',            ''),
  ('customization_option_facebook_enabled',    'false'),
  ('customization_facebook_text',              'Message us on Facebook for product details'),
  ('customization_facebook_link',              ''),
  ('customization_requires_advance',           'false'),
  ('customization_advance_amount',             'half'),
  ('whatsapp_number',                          ''),
  -- Delivery zone areas
  ('delivery_dhaka_city_areas', E'Gulshan\nBanani\nDhanmondi\nMirpur\nUttara\nMohammadpur\nBadda'),
  ('delivery_sub_dhaka_areas',  E'Ashulia\nDhamrai\nDohar\nHemayetpur\nKeraniganj Model\nNawabganj\nSavar\nSouth Keraniganj'),
  -- Payment
  ('payment_cod_enabled',     'true'),
  ('payment_advance_enabled', 'false'),
  ('payment_bkash_number',    ''),
  ('payment_nagad_number',    ''),
  ('payment_advance_type',    'delivery'),
  -- Footer / contact
  ('footer_phone',             ''),
  ('footer_email',             'info@evolutiongadget.com'),
  ('footer_address',           'Dhaka, Bangladesh'),
  ('footer_facebook_url',      ''),
  ('footer_instagram_url',     ''),
  ('footer_brand_description', 'A trusted destination for cutting-edge accessories and mobile marvels.'),
  ('footer_google_maps_url',   ''),
  -- Policy pages
  ('policy_about_us', 'Welcome to Evolution Gadget — your trusted destination for cutting-edge accessories and mobile marvels.'),
  ('policy_shipping', 'Fast and reliable delivery across Bangladesh. Inside Dhaka — ৳60. Sub-Dhaka — ৳80. Outside Dhaka — ৳120.'),
  ('policy_returns',  'You can return or exchange items if they are wrong, damaged, or unused. Contact us within 3 days of delivery.'),
  ('policy_privacy',  'Your data is safe. We use your information only to process orders and improve your shopping experience.'),
  ('policy_terms',    'By using the Evolution Gadget website, you agree to our terms and conditions.'),
  -- Marketing pixels
  ('meta_pixel_enabled', 'false'),
  ('meta_pixel_id',      ''),
  ('meta_access_token',  ''),
  ('gtm_enabled',        'false'),
  ('gtm_id',             ''),
  -- Pickup info
  ('pickup_name',     'Evolution Gadget'),
  ('pickup_phone',    ''),
  ('pickup_address',  ''),
  ('pickup_city_id',  '1'),
  ('pickup_zone_id',  ''),
  ('pickup_area_id',  '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DONE.
-- Categories and products are intentionally empty — create them
-- through the admin panel after running setup-admin.sql.
-- ============================================================
