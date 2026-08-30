import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VarietyOffering {
  offering_id: string;
  variety_id: string;
  variety_name: string | null;
  variety_code: string | null;
  crop_label: string | null;
  company_id: string;
  company_name: string | null;
  company_logo_url: string | null;
  company_sku: string | null;
  brand_name: string | null;
  price: number | null;
  currency: string | null;
  pack_size: number | null;
  pack_unit: string | null;
  availability_status: string | null;
  regions: string[] | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export interface OfferingFormValues {
  company_id: string;
  company_sku: string;
  brand_name: string;
  price: string;
  currency: string;
  pack_size: string;
  pack_unit: string;
  availability_status: string;
  regions: string[];
  notes: string;
}

export const AVAILABILITY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'discontinued', label: 'Discontinued' },
];

/**
 * Read + write access to seller offerings (variety_company_offerings)
 * for a single seed variety (master_products row).
 */
export const useVarietyOfferings = (varietyId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['variety-offerings', varietyId];

  const offeringsQuery = useQuery({
    queryKey,
    enabled: !!varietyId,
    queryFn: async (): Promise<VarietyOffering[]> => {
      const { data, error } = await supabase
        .from('v_variety_offerings')
        .select('*')
        .eq('variety_id', varietyId!)
        .order('company_name', { ascending: true });
      if (error) throw error;
      return ((data || []) as any[]).filter((row) => !!row.offering_id) as VarietyOffering[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['variety-offerings'] });
  };

  const toPayload = (values: OfferingFormValues) => ({
    company_id: values.company_id,
    company_sku: values.company_sku.trim() || null,
    brand_name: values.brand_name.trim() || null,
    price: values.price.trim() === '' ? null : Number(values.price),
    currency: values.currency || 'INR',
    pack_size: values.pack_size.trim() === '' ? null : Number(values.pack_size),
    pack_unit: values.pack_unit.trim() || null,
    availability_status: values.availability_status || 'available',
    regions: values.regions,
    notes: values.notes.trim() || null,
  });

  const createOffering = useMutation({
    mutationFn: async (values: OfferingFormValues) => {
      if (!varietyId) throw new Error('No variety selected');
      const { error } = await supabase.from('variety_company_offerings').insert({
        variety_id: varietyId,
        is_active: true,
        ...toPayload(values),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Seller offering added');
    },
    onError: (error: any) => {
      toast.error(
        error?.code === '23505' || error?.code === '23000' || error?.code === '23514'
          ? 'This seller already has an offering for this variety'
          : error?.message || 'Failed to add offering'
      );
    },
  });

  const updateOffering = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: OfferingFormValues }) => {
      const { error } = await supabase
        .from('variety_company_offerings')
        .update(toPayload(values))
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Seller offering updated');
    },
    onError: (error: any) => toast.error(error?.message || 'Failed to update offering'),
  });

  const setOfferingActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('variety_company_offerings')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      return isActive;
    },
    onSuccess: (isActive) => {
      invalidate();
      toast.success(isActive ? 'Offering activated' : 'Offering deactivated');
    },
    onError: (error: any) => toast.error(error?.message || 'Failed to change offering status'),
  });

  return {
    offerings: offeringsQuery.data ?? [],
    isLoading: offeringsQuery.isLoading,
    error: offeringsQuery.error as Error | null,
    createOffering,
    updateOffering,
    setOfferingActive,
  };
};

export interface DuplicateVarietyMatch {
  id: string;
  name: string;
  variety_code: string | null;
  status: string | null;
  company_name: string | null;
}

/**
 * Guardrail: look for existing seed varieties with the same/similar
 * name or variety code before a new one is created.
 */
export const useDuplicateVarietyCheck = (name: string, enabled: boolean) => {
  const term = name.trim();

  return useQuery({
    queryKey: ['variety-duplicate-check', term.toLowerCase()],
    enabled: enabled && term.length >= 3,
    staleTime: 30_000,
    queryFn: async (): Promise<DuplicateVarietyMatch[]> => {
      const escaped = term.replace(/[%,()]/g, ' ').trim();
      const { data, error } = await supabase
        .from('master_products')
        .select('id, name, variety_code, status, company:master_companies!master_products_company_id_fkey(name)')
        .eq('product_type', 'seed')
        .or(`name.ilike.%${escaped}%,variety_code.ilike.%${escaped}%`)
        .limit(5);
      if (error) throw error;
      return ((data || []) as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        variety_code: row.variety_code,
        status: row.status,
        company_name: row.company?.name ?? null,
      }));
    },
  });
};
