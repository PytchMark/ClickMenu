// Create reviews table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function createReviewsTable() {
  // Try to create reviews table via SQL Editor in Supabase Dashboard
  // For now, we'll check if we can insert a review
  
  console.log('Testing reviews table access...');
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('Reviews table does not exist. Please create it in Supabase Dashboard SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  customer_name TEXT DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
    `);
  } else {
    console.log('Reviews table exists! Found', data?.length || 0, 'reviews');
  }
}

createReviewsTable();
