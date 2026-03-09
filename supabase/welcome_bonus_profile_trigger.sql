-- Welcome Bonus: set reward_points and lifetime_points to 100 when a new profile is created.
-- Run this in the Supabase SQL Editor if you use a database trigger to create profiles from auth.users.
--
-- Option A: You already have a trigger (e.g. handle_new_user). Edit that function and in the
-- INSERT into public.profiles set:
--   reward_points = 100,
--   lifetime_points = 100,
-- instead of 0 or null.
--
-- Option B: Create the trigger from scratch. Adjust the INSERT column list to match your
-- public.profiles table (e.g. add first_name, last_name, referral_code if required).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, reward_points, lifetime_points)
  VALUES (NEW.id, 100, 100);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
