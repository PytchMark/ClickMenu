-- ClickMenu Billing & Plans Schema Update
-- Run this SQL in your Supabase SQL Editor

-- Add billing and plan-related columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'plan1',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS max_items int,
  ADD COLUMN IF NOT EXISTS max_images_per_item int DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_videos_per_item int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS addon_live_menu boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_pos_waitlist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Update existing merchants to have plan1 defaults if NULL
UPDATE profiles 
SET 
  plan_tier = 'plan1',
  max_items = 6,
  max_images_per_item = 3,
  max_videos_per_item = 0
WHERE plan_tier IS NULL;

-- Add check constraint for plan_tier
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_tier_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_tier_check
  CHECK (plan_tier IN ('plan1', 'plan2', 'plan3'));

-- Add check constraint for status
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending_payment', 'active', 'paused', 'canceled'));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON profiles(plan_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN profiles.plan_tier IS 'Subscription plan: plan1 (Starter), plan2 (Growth), plan3 (Unlimited)';
COMMENT ON COLUMN profiles.status IS 'Account status: pending_payment, active, paused, canceled';
COMMENT ON COLUMN profiles.max_items IS 'Maximum menu items allowed for this plan';
COMMENT ON COLUMN profiles.max_images_per_item IS 'Maximum images per menu item';
COMMENT ON COLUMN profiles.max_videos_per_item IS 'Maximum videos per menu item';
COMMENT ON COLUMN profiles.addon_live_menu IS 'Live Menu add-on enabled';
COMMENT ON COLUMN profiles.addon_pos_waitlist IS 'POS System waitlist opt-in';
