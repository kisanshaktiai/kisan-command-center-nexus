import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PresetTheme } from '@/lib/whitelabel-types/themeMapping';

/**
 * Quick Start themes for the White Label Config > Mobile tab, resolved for
 * ONE tenant.
 *
 * The catalogue is public.master_themes (managed on the Master Themes page).
 * This hook calls get_tenant_master_themes(tenant_id), which returns only the
 * themes that tenant's subscription plan allows — so the admin sees exactly
 * what the tenant sees in its own portal. Platform admins pass the function's
 * access check via is_super_admin().
 *
 * `id` is the row's slug, so the panel's existing preset.id handling is
 * unchanged.
 */
export interface MasterTheme {
  id: string;
  name: string;
  description: string | null;
  theme: PresetTheme;
}

interface MasterThemeRow {
  slug: string;
  name: string;
  description: string | null;
  theme: unknown;
}

export const useMasterThemes = (tenantId?: string | null) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['master-themes', tenantId],
    queryFn: async (): Promise<MasterTheme[]> => {
      if (!tenantId) return [];

      // get_tenant_master_themes is not in the generated Supabase types yet.
      const { data, error } = await supabase
        .rpc('get_tenant_master_themes' as any, { p_tenant_id: tenantId } as any);

      if (error) throw error;

      // The function already filters by plan and orders by sort_order.
      return ((data ?? []) as MasterThemeRow[]).map(row => ({
        id: row.slug,
        name: row.name,
        description: row.description,
        theme: row.theme as PresetTheme,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { presetThemes: data ?? [], isLoading, error };
};
