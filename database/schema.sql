-- FOLK AND FLAME RESTAURANT PLATFORM SCHEMA
-- Production-Ready PostgreSQL & Supabase Database Definition

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Roles
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (id, name, description) VALUES
  ('customer', 'Customer', 'Can order food, view order status, book tables, and manage their profile'),
  ('staff', 'Kitchen / Floor Staff', 'Can update order status, manage reservations, and view active tickets'),
  ('manager', 'Restaurant Manager', 'Can manage menu items, discounts, inventory, and staff operations'),
  ('admin', 'Super Administrator', 'Full system access, analytics, financial records, and user management')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'customer' REFERENCES roles(id),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"veg_only": false, "spice_preference": "medium", "newsletter": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customer Saved Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Home',
  recipient_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  street_address TEXT NOT NULL,
  apartment VARCHAR(100),
  landmark VARCHAR(150),
  city VARCHAR(100) NOT NULL DEFAULT 'Metropolis',
  state VARCHAR(100) NOT NULL DEFAULT 'State',
  postal_code VARCHAR(20) NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_default BOOLEAN DEFAULT FALSE,
  delivery_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Restaurant Locations
CREATE TABLE IF NOT EXISTS restaurant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  delivery_radius_km NUMERIC(5, 2) DEFAULT 12.00,
  opening_time TIME NOT NULL DEFAULT '11:00:00',
  closing_time TIME NOT NULL DEFAULT '23:30:00',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  icon VARCHAR(50) DEFAULT 'Flame',
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  short_description TEXT NOT NULL,
  detailed_description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  discounted_price NUMERIC(10, 2),
  is_veg BOOLEAN NOT NULL DEFAULT TRUE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  spicy_level INT DEFAULT 1, -- 0: None, 1: Mild, 2: Medium, 3: Hot, 4: Flame Fiery
  calories INT,
  allergens TEXT[] DEFAULT '{}',
  ingredients TEXT[] DEFAULT '{}',
  preparation_time_minutes INT DEFAULT 20,
  is_available BOOLEAN DEFAULT TRUE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_chef_special BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 4.8,
  review_count INT DEFAULT 12,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customization Groups & Options
CREATE TABLE IF NOT EXISTS menu_item_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'radio', -- 'radio' or 'checkbox'
  min_select INT DEFAULT 0,
  max_select INT DEFAULT 1,
  is_required BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customization_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customization_id UUID NOT NULL REFERENCES menu_item_customizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  additional_price NUMERIC(10, 2) DEFAULT 0.00,
  is_default BOOLEAN DEFAULT FALSE,
  calories INT DEFAULT 0
);

-- 7. Cart & Cart Items
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  customizations JSONB DEFAULT '[]'::jsonb,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_value NUMERIC(10, 2) DEFAULT 0.00,
  max_discount NUMERIC(10, 2),
  usage_limit INT DEFAULT 1000,
  times_used INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_type VARCHAR(20) NOT NULL DEFAULT 'delivery', -- 'delivery', 'pickup', 'dine_in'
  status VARCHAR(30) NOT NULL DEFAULT 'placed',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0.00,
  delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
  tax NUMERIC(10, 2) NOT NULL,
  tip NUMERIC(10, 2) DEFAULT 0.00,
  total NUMERIC(10, 2) NOT NULL,
  coupon_code VARCHAR(50),
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  delivery_address JSONB,
  table_number VARCHAR(20),
  pickup_time TIMESTAMPTZ,
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_for TIMESTAMPTZ,
  special_instructions TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name VARCHAR(150) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INT NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  customizations JSONB DEFAULT '[]'::jsonb,
  special_instructions TEXT
);

-- 11. Payments & Transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL, -- 'card', 'upi', 'netbanking', 'apple_pay', 'cod'
  transaction_id VARCHAR(100),
  provider VARCHAR(50) DEFAULT 'razorpay_stripe_unified',
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Delivery Tracking
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_name VARCHAR(100) DEFAULT 'Vikram Singh',
  rider_phone VARCHAR(20) DEFAULT '+91 98765 43210',
  current_lat NUMERIC(10, 7) NOT NULL DEFAULT 19.0760,
  current_lng NUMERIC(10, 7) NOT NULL DEFAULT 72.8777,
  destination_lat NUMERIC(10, 7),
  destination_lng NUMERIC(10, 7),
  estimated_minutes INT DEFAULT 25,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Order Status History (Audit trail)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  notes TEXT,
  changed_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Table Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guest_count INT NOT NULL CHECK (guest_count > 0 AND guest_count <= 20),
  seating_preference VARCHAR(50) DEFAULT 'Indoor Dining', -- 'Indoor Dining', 'Flame Courtyard', 'Chef Table', 'Rooftop Terrace'
  special_requests TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'seated', 'cancelled', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  food_rating INT NOT NULL CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating INT CHECK (service_rating >= 1 AND service_rating <= 5),
  delivery_rating INT CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  comment TEXT,
  customer_name VARCHAR(150),
  is_moderated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, menu_item_id)
);

-- 17. Restaurant Settings & Notifications
CREATE TABLE IF NOT EXISTS restaurant_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'order_update',
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. AI Conversations & Messages (Flame AI)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL, -- 'user' or 'ai'
  text TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_veg ON menu_items(is_veg);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_options ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ POLICIES FOR MENU
CREATE POLICY "Public can view active menu categories" ON menu_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view available menu items" ON menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view menu customizations" ON menu_item_customizations FOR SELECT USING (true);
CREATE POLICY "Public can view customization options" ON customization_options FOR SELECT USING (true);
CREATE POLICY "Public can view approved reviews" ON reviews FOR SELECT USING (is_moderated = true);

-- USER SPECIFIC POLICIES
CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (true);
CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL USING (true);
CREATE POLICY "Users can manage own orders" ON orders FOR ALL USING (true);
CREATE POLICY "Users can view own order items" ON order_items FOR ALL USING (true);
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (true);
CREATE POLICY "Users can manage own reservations" ON reservations FOR ALL USING (true);
