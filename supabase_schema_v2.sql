-- ============================================================
-- QuickMenuJA Supabase Schema v2
-- Run this fresh in your Supabase SQL editor
-- Drop existing tables first if needed with: DROP TABLE IF EXISTS ... CASCADE;
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES TABLE (Merchant accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'pending_payment', 'suspended', 'onboarding')),
  
  -- Contact & Business Info
  whatsapp TEXT,
  profile_email TEXT,
  password TEXT NOT NULL,
  cuisine_type TEXT,
  logo_url TEXT,
  business_address TEXT,
  parish TEXT,
  hours TEXT,
  about TEXT,
  
  -- Owner Details
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  
  -- Social Media
  instagram TEXT,
  tiktok TEXT,
  
  -- Fulfillment Options
  pickup_enabled BOOLEAN DEFAULT TRUE,
  delivery_enabled BOOLEAN DEFAULT TRUE,
  
  -- Authorization & Plan
  authorized BOOLEAN DEFAULT FALSE,
  plan_tier TEXT DEFAULT 'plan1' CHECK (plan_tier IN ('plan1', 'plan2', 'plan3')),
  max_items INTEGER DEFAULT 5,
  max_images_per_item INTEGER DEFAULT 2,
  max_videos_per_item INTEGER DEFAULT 0,
  
  -- Billing (Stripe)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  
  -- Addons
  addon_live_menu BOOLEAN DEFAULT FALSE,
  addon_pos_waitlist BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. MENU_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES profiles(store_id) ON UPDATE CASCADE ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  
  -- Item Details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Status & Visibility
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'limited', 'sold_out', 'hidden')),
  featured BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  
  -- Labels (stored as JSONB array)
  labels JSONB DEFAULT '[]'::JSONB,
  
  -- Media
  image_url TEXT,
  video_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for store_id + item_id
  UNIQUE (store_id, item_id)
);

-- ============================================================
-- 3. ORDER_REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  store_id TEXT NOT NULL REFERENCES profiles(store_id) ON UPDATE CASCADE ON DELETE CASCADE,
  
  -- Order Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'preparing', 'ready', 'completed', 'canceled')),
  
  -- Customer Info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT,
  
  -- Order Items (stored as JSONB array)
  items_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- Fulfillment
  fulfillment_type TEXT NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
  parish TEXT,
  delivery_address TEXT,
  delivery_notes TEXT,
  preferred_time TEXT,
  
  -- Totals
  subtotal NUMERIC(10,2),
  
  -- Source
  source TEXT DEFAULT 'storefront',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES profiles(store_id) ON UPDATE CASCADE ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  customer_name TEXT DEFAULT 'Anonymous',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. DAILY_SPECIALS TABLE (Pro feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES profiles(store_id) ON UPDATE CASCADE ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  
  active BOOLEAN DEFAULT TRUE,
  display_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (store_id, item_id, display_date)
);

-- ============================================================
-- 6. AUDIT_EVENTS TABLE (Optional logging)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT,
  action TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(profile_email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON menu_items(store_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);

CREATE INDEX IF NOT EXISTS idx_order_requests_store_id ON order_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_requests_created ON order_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_specials_store_date ON daily_specials(store_id, display_date);

-- ============================================================
-- USEFUL VIEW: Top requested items
-- ============================================================
CREATE OR REPLACE VIEW top_items_requested AS
SELECT
  store_id,
  item->>'itemId' AS item_id,
  item->>'title' AS title,
  COUNT(*) AS total_requests
FROM order_requests,
  jsonb_array_elements(items_json) AS item
GROUP BY store_id, item->>'itemId', item->>'title'
ORDER BY total_requests DESC;

-- ============================================================
-- STORAGE BUCKET (Run in Supabase Dashboard > Storage)
-- Create a bucket named 'menu-items' with public access
-- ============================================================

-- Note: Storage buckets are created via Supabase Dashboard:
-- 1. Go to Storage in your Supabase project
-- 2. Click "New Bucket"
-- 3. Name: menu-items
-- 4. Check "Public bucket"
-- 5. Click Create

-- RLS Policies (if needed - currently using service role server-side)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED DATA: Test Merchant Profile
-- ============================================================
INSERT INTO profiles (
  store_id,
  name,
  status,
  whatsapp,
  profile_email,
  password,
  cuisine_type,
  parish,
  about,
  owner_name,
  authorized,
  plan_tier,
  max_items,
  max_images_per_item
) VALUES (
  'TASTE1',
  'Kingston Taste Kitchen',
  'active',
  '+1876555001',
  'hello@kingstontaste.com',
  'demo123',
  'Jamaican',
  'Kingston',
  'Authentic Jamaican cuisine made with love. Serving the best jerk chicken, curry goat, and ackee & saltfish in Kingston.',
  'Marcus Thompson',
  true,
  'plan2',
  25,
  5
) ON CONFLICT (store_id) DO NOTHING;

-- ============================================================
-- SEED DATA: Sample Menu Items
-- ============================================================
INSERT INTO menu_items (store_id, item_id, title, description, category, price, status, featured, labels) VALUES
  ('TASTE1', 'ITEM-001', 'Jerk Chicken Paradise', 'Tender chicken marinated in our secret jerk spice blend, slow-grilled over pimento wood. Served with rice & peas and festival.', 'Lunch', 1900, 'available', true, '["Popular", "Signature"]'::jsonb),
  ('TASTE1', 'ITEM-002', 'Curry Goat Supreme', 'Slow-cooked goat in rich Caribbean curry with potatoes and herbs. A true Jamaican classic.', 'Dinner', 2300, 'available', true, '["Top Pick", "Featured"]'::jsonb),
  ('TASTE1', 'ITEM-003', 'Ackee & Saltfish Perfection', 'Jamaica''s national dish - creamy ackee sautéed with salted codfish, onions, tomatoes, and scotch bonnet peppers.', 'Breakfast', 1700, 'available', false, '["Traditional"]'::jsonb),
  ('TASTE1', 'ITEM-004', 'Oxtail Stew', 'Fall-off-the-bone oxtail braised in rich gravy with butter beans. Grandma''s recipe perfected.', 'Dinner', 2800, 'available', true, '["Top Pick", "Signature"]'::jsonb),
  ('TASTE1', 'ITEM-005', 'Escovitch Fish', 'Crispy fried snapper topped with tangy pickled vegetables - peppers, onions, and carrots.', 'Lunch', 2200, 'available', false, '["Spicy"]'::jsonb)
ON CONFLICT (store_id, item_id) DO NOTHING;

-- ============================================================
-- SEED DATA: Sample Reviews
-- ============================================================
INSERT INTO reviews (store_id, rating, comment, customer_name) VALUES
  ('TASTE1', 5, 'Best jerk chicken in Kingston! The flavors are incredible.', 'Sarah M.'),
  ('TASTE1', 5, 'Curry goat was amazing, just like my grandmother used to make.', 'David R.'),
  ('TASTE1', 4, 'Great food, fast service. Will definitely order again!', 'Michelle P.')
ON CONFLICT DO NOTHING;
