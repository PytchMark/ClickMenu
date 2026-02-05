-- ClickMenu Subscription System Migration
-- Run this SQL in your Supabase SQL editor

-- 1. Add subscription-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- 2. Add constraint for plan values
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_plan_check
CHECK (plan IN ('free', 'pro', 'business'));

-- 3. Add constraint for subscription status values
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_status_check
CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete'));

-- 4. Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- 5. Add daily specials table for Pro+ merchants
CREATE TABLE IF NOT EXISTS daily_specials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL REFERENCES profiles(store_id) ON UPDATE CASCADE ON DELETE CASCADE,
  item_id text NOT NULL,
  title text NOT NULL,
  description text,
  price numeric,
  image_url text,
  active boolean DEFAULT true,
  display_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (store_id, item_id, display_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_specials_store_id ON daily_specials(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_specials_display_date ON daily_specials(display_date);
CREATE INDEX IF NOT EXISTS idx_daily_specials_active ON daily_specials(active);

-- 6. Add live menu rotations table for Pro+ merchants
CREATE TABLE IF NOT EXISTS live_menu_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL REFERENCES profiles(store_id) ON UPDATE CASCADE ON DELETE CASCADE,
  rotation_name text NOT NULL,
  item_ids jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  day_of_week integer, -- 0=Sunday, 1=Monday, etc. NULL=custom
  start_time time,
  end_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_menu_rotations_store_id ON live_menu_rotations(store_id);
CREATE INDEX IF NOT EXISTS idx_live_menu_rotations_active ON live_menu_rotations(active);

-- 7. Update existing profiles to have 'free' plan if NULL
UPDATE profiles SET plan = 'free' WHERE plan IS NULL;
UPDATE profiles SET subscription_status = 'active' WHERE subscription_status IS NULL;

-- 8. Add store_id validation constraint (optional - enforces format)
-- Uncomment if you want database-level validation
-- ALTER TABLE profiles
-- ADD CONSTRAINT profiles_store_id_format_check
-- CHECK (store_id ~ '^[A-Z][A-Z0-9]{0,5}$');

COMMENT ON TABLE daily_specials IS 'Daily special items for Pro+ merchants';
COMMENT ON TABLE live_menu_rotations IS 'Rotating menu configurations for Pro+ merchants';
COMMENT ON COLUMN profiles.plan IS 'Subscription plan: free, pro, business';
COMMENT ON COLUMN profiles.subscription_status IS 'Stripe subscription status';
