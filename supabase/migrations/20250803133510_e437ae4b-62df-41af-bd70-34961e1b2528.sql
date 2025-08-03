
-- Deep audit and cleanup of leads table RLS policies
-- Remove duplicate, conflicting, and overly permissive policies

-- Step 1: Remove duplicate anonymous/public insert policies (keep the most descriptive one)
DROP POLICY IF EXISTS "Allow anonymous lead submission" ON public.leads;
DROP POLICY IF EXISTS "Anonymous can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to submit leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can submit leads" ON public.leads;

-- Step 2: Remove overly permissive public read access (major security risk)
DROP POLICY IF EXISTS "Anonymous can read inserted leads" ON public.leads;

-- Step 3: Consolidate admin management policies (remove redundant granular ones)
DROP POLICY IF EXISTS "Super admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

-- Step 4: Ensure we have the essential policies in place
-- Keep "Allow anonymous lead submissions" for form submissions
-- Keep "Admins can manage all leads" for comprehensive admin access
-- Keep user-specific policies for lead creators

-- Verify the final policy structure by checking what remains
-- The remaining policies should be:
-- 1. "Allow anonymous lead submissions" - For lead form submissions
-- 2. "Admins can manage all leads" - Comprehensive admin access  
-- 3. "Users can view their own leads" - User access to their submissions
-- 4. "Users can update their own leads" - User can update their submissions
-- 5. "Users can delete their own leads" - User can delete their submissions
