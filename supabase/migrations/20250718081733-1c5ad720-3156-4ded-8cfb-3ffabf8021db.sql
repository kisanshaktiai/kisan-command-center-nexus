
-- Create the admin_users table in the public schema
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin users
CREATE POLICY "Admin users can view admin_users" ON public.admin_users
  FOR SELECT USING (
    email IN (
      SELECT email FROM public.admin_users WHERE is_active = true
    )
  );

-- Insert the super admin user
INSERT INTO public.admin_users (email, full_name, role, is_active)
VALUES ('kisanshaktiai@gmail.com', 'Amarsinh Patil', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();
