// Database setup script for QuickMenuJA
// Run with: node scripts/setup-db.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function setupDatabase() {
  console.log('Setting up QuickMenuJA database...');
  console.log('Supabase URL:', supabaseUrl);

  // Create tables using raw SQL
  const createTablesSQL = `
    -- Profiles table (merchants)
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      store_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      plan TEXT DEFAULT 'free',
      plan_tier TEXT DEFAULT 'plan1',
      subscription_status TEXT DEFAULT 'active',
      whatsapp TEXT,
      profile_email TEXT,
      password TEXT,
      logo_url TEXT,
      business_address TEXT,
      parish TEXT,
      owner_name TEXT,
      owner_phone TEXT,
      owner_email TEXT,
      cuisine_type TEXT,
      hours TEXT,
      about TEXT,
      instagram TEXT,
      tiktok TEXT,
      pickup_enabled BOOLEAN DEFAULT true,
      delivery_enabled BOOLEAN DEFAULT true,
      authorized BOOLEAN DEFAULT false,
      max_items INTEGER DEFAULT 6,
      max_images_per_item INTEGER DEFAULT 3,
      max_videos_per_item INTEGER DEFAULT 0,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Menu items table
    CREATE TABLE IF NOT EXISTS menu_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES profiles(store_id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price NUMERIC(10,2),
      status TEXT DEFAULT 'available',
      featured BOOLEAN DEFAULT false,
      labels JSONB DEFAULT '[]'::jsonb,
      image_url TEXT,
      video_url TEXT,
      archived BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, item_id)
    );

    -- Order requests table
    CREATE TABLE IF NOT EXISTS order_requests (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      request_id TEXT UNIQUE NOT NULL,
      store_id TEXT NOT NULL REFERENCES profiles(store_id) ON DELETE CASCADE,
      status TEXT DEFAULT 'new',
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      notes TEXT,
      items_json JSONB DEFAULT '[]'::jsonb,
      fulfillment_type TEXT DEFAULT 'pickup',
      parish TEXT,
      delivery_address TEXT,
      delivery_notes TEXT,
      preferred_time TEXT,
      subtotal NUMERIC(10,2),
      source TEXT DEFAULT 'storefront',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Daily specials table
    CREATE TABLE IF NOT EXISTS daily_specials (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES profiles(store_id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      price NUMERIC(10,2),
      image_url TEXT,
      active BOOLEAN DEFAULT true,
      display_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, item_id, display_date)
    );

    -- Reviews table
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES profiles(store_id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      customer_name TEXT DEFAULT 'Anonymous',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON menu_items(store_id);
    CREATE INDEX IF NOT EXISTS idx_order_requests_store_id ON order_requests(store_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
    CREATE INDEX IF NOT EXISTS idx_daily_specials_store_id ON daily_specials(store_id);
  `;

  try {
    // Execute table creation
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (tableError) {
      console.log('Note: Tables might already exist or RPC not available. Trying direct insertion...');
    } else {
      console.log('Tables created successfully!');
    }
  } catch (err) {
    console.log('RPC method not available, tables should be created via Supabase Dashboard SQL editor');
  }

  // Seed test data
  console.log('\nSeeding test data...');

  // Test merchant profile
  const testProfile = {
    store_id: 'TASTE1',
    name: 'Kingston Taste Kitchen',
    status: 'active',
    plan: 'pro',
    plan_tier: 'plan2',
    subscription_status: 'active',
    whatsapp: '+18765551234',
    profile_email: 'hello@kingstontaste.com',
    password: 'demo123',
    logo_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80',
    business_address: '123 Hope Road',
    parish: 'Kingston',
    owner_name: 'Marcus Thompson',
    owner_phone: '+18765551234',
    owner_email: 'marcus@kingstontaste.com',
    cuisine_type: 'Caribbean Fusion',
    hours: 'Mon-Sat: 11am-10pm, Sun: 12pm-9pm',
    about: 'Experience authentic Caribbean flavors with a modern twist.',
    instagram: '@kingstontaste',
    tiktok: '@kingstontaste',
    pickup_enabled: true,
    delivery_enabled: true,
    authorized: true
  };

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert(testProfile, { onConflict: 'store_id' })
    .select();

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
  } else {
    console.log('Test profile created:', profileData?.[0]?.store_id);
  }

  // Test menu items
  const menuItems = [
    {
      store_id: 'TASTE1',
      item_id: 'ITEM-001',
      title: 'Jerk Chicken Paradise',
      description: 'Succulent chicken marinated for 24 hours in our secret jerk blend.',
      category: 'Lunch',
      price: 18.99,
      status: 'available',
      featured: true,
      labels: ['Popular', 'Signature'],
      image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80'
    },
    {
      store_id: 'TASTE1',
      item_id: 'ITEM-002',
      title: 'Curry Goat Supreme',
      description: 'Tender goat meat slow-cooked in aromatic curry spices.',
      category: 'Dinner',
      price: 22.50,
      status: 'available',
      featured: true,
      labels: ['Top Pick'],
      image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80'
    },
    {
      store_id: 'TASTE1',
      item_id: 'ITEM-003',
      title: 'Ackee & Saltfish Perfection',
      description: "Jamaica's national dish done right!",
      category: 'Breakfast',
      price: 16.99,
      status: 'available',
      featured: false,
      labels: ['Traditional'],
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    }
  ];

  for (const item of menuItems) {
    const { error: itemError } = await supabase
      .from('menu_items')
      .upsert(item, { onConflict: 'store_id,item_id' });
    
    if (itemError) {
      console.error('Error creating menu item:', item.item_id, itemError.message);
    } else {
      console.log('Menu item created:', item.item_id);
    }
  }

  // Test reviews
  const reviews = [
    {
      store_id: 'TASTE1',
      rating: 5,
      comment: 'Amazing jerk chicken! Best in Kingston.',
      customer_name: 'Marcus J.'
    },
    {
      store_id: 'TASTE1',
      rating: 4,
      comment: 'Great food, quick service.',
      customer_name: 'Sarah W.'
    },
    {
      store_id: 'TASTE1',
      rating: 5,
      comment: 'The curry goat is incredible!',
      customer_name: 'Devon T.'
    }
  ];

  for (const review of reviews) {
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert(review);
    
    if (reviewError) {
      console.error('Error creating review:', reviewError.message);
    } else {
      console.log('Review created for:', review.customer_name);
    }
  }

  console.log('\nDatabase setup complete!');
  console.log('\nTest credentials:');
  console.log('  Store ID: TASTE1');
  console.log('  Password: demo123');
}

setupDatabase().catch(console.error);
