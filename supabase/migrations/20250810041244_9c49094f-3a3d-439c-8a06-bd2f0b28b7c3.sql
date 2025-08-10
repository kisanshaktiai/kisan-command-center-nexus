` block for updating the function. I can also suggest broadening the function to include 'trial' options and mention the reasoning. Additionally, I can consider querying another source to confirm that `get_onboarding_template` returns an array. However, since allowing multiple workflows isn't critical, I’ll leave that aspect as is for now." duration="2.356911">
</lov-tool-use>

<lov-tool-use id="thinking-19917503-3a27-491b-b972-c4dcd49d1255" name="lov-think" data="**Drafting the response plan**

Alright, I need to draft a clear message that acknowledges the user’s issue with an empty list. I’ll provide an explanation: it's because only active tenants with workflows are shown. The SQL fix will involve altering the function to include statuses other than suspended and archived, and I could suggest adding a view for readability, though that’s optional.

I should outline a plan, mentioning that after the user runs the provided SQL, they should see six tenants. I need to balance including `<lov-actions>` for \"Implement the plan\" while ensuring I'm not mixing in code changes. The Supabase instructions say to wait for SQL confirmation, so the focus will be on that!" duration="8.533525">
</lov-tool-use>

<lov-tool-use id="thinking-4acc7cb8-f5a3-4a8a-a28e-6466b8dbbf00" name="lov-think" data="**Developing the SQL and support plan**

Let's outline a brief plan with clear steps: first, update the function; next, refresh the page; if the list is still empty, run a debug query to check statuses and workflows; and optionally consider a UI fallback later. I need to provide the SQL now, ensuring that it replaces the existing function and includes the correct `SET search_path`. We can propose parameters to allow multiple workflows while filtering out active ones. 

Finally, it's a good idea to include a troubleshooting link, given the user’s previous looping issue, just to be thorough!" duration="1.871957">
</lov-tool-use>
Thanks for the clear signal. Your onboarding tenant list is empty because the RPC currently filters tenants by status = 'active' and also excludes any tenant that already has an onboarding workflow. In your data:

- Tenants: 8 total (1 active, 7 trial)
- The only active tenant already has a workflow
- Result: 0 available tenants

Fix: Broaden the RPC to include non-archived/non-suspended tenants and only exclude tenants that have a non-completed workflow. This will surface your 6 trial tenants with no workflows.

I’ll update the function accordingly.

<lov-sql>
CREATE OR REPLACE FUNCTION public.get_available_tenants_for_onboarding()
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name
  FROM public.tenants t
  WHERE t.status NOT IN ('archived', 'suspended')
    AND NOT EXISTS (
      SELECT 1
      FROM public.onboarding_workflows ow
      WHERE ow.tenant_id = t.id
        AND ow.status <> 'completed'
    )
  ORDER BY t.created_at DESC;
END;
$$;
