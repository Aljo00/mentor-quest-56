-- 1. Add RLS policy for superadmin to view all user_roles
CREATE POLICY "Superadmins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (is_superadmin(auth.uid()));

-- 2. Add RLS policies to profiles table
CREATE POLICY "Superadmins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 4. Add due_date column to payments table (it's being referenced but doesn't exist)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;