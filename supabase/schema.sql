-- Clean up existing objects to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.leads;
DROP TABLE IF EXISTS public.services;
DROP TABLE IF EXISTS public.profiles;

-- 1. Profiles Table (Extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  lifetime_spent NUMERIC DEFAULT 0.00,
  lifetime_saved NUMERIC DEFAULT 0.00,
  saved_vehicles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Services Table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC NOT NULL,
  xp_reward INTEGER NOT NULL,
  category TEXT NOT NULL, -- 'interior', 'exterior', 'full', 'monthly'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bookings Table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT,
  vehicle TEXT,
  address TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 0,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  amount_saved NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Leads Table (For tracking points even before signup)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  vehicle TEXT,
  service TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Users can view their own profiles" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select leads" ON public.leads FOR SELECT USING (true);

-- Trigger to create profile on signup & transfer guest points
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  initial_xp INTEGER;
  initial_spent NUMERIC;
  saved_phone TEXT;
  saved_address TEXT;
BEGIN
  -- Get most recent data from leads
  SELECT phone, address INTO saved_phone, saved_address FROM public.leads WHERE email = new.email ORDER BY created_at DESC LIMIT 1;
  
  -- Transfer history from leads
  SELECT COALESCE(SUM(total_price), 0) INTO initial_xp FROM public.leads WHERE email = new.email;
  SELECT COALESCE(SUM(total_price), 0) INTO initial_spent FROM public.leads WHERE email = new.email;

  INSERT INTO public.profiles (id, email, full_name, phone, address, avatar_url, xp, lifetime_spent, level)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    saved_phone,
    saved_address,
    new.raw_user_meta_data->>'avatar_url', 
    initial_xp, 
    initial_spent,
    1
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Initial Data
INSERT INTO public.services (name, description, price, xp_reward, category) VALUES
('Interior Detail', 'Deep cleaning of all interior surfaces, vacuuming, and conditioning.', 150.00, 1500, 'interior'),
('Exterior Detail', 'Professional hand wash, clay bar treatment, and Hyper Gloss Spray Wax.', 125.00, 1250, 'exterior'),
('Elite Detail', 'The ultimate package: Complete interior and exterior restoration.', 250.00, 2500, 'full'),
('Monthly Interior', 'Maintenance interior detail once per month.', 99.00, 1000, 'monthly'),
('The Elite Monthly', 'Full maintenance detail once per month.', 199.00, 2000, 'monthly')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category;
