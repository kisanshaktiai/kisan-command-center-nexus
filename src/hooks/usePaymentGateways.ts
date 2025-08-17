
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentGateway, TenantPaymentConfig, PaymentGatewayType } from '@/types/payment';
import { useNotifications } from '@/hooks/useNotifications';

export const usePaymentGateways = () => {
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();

  // Fetch available payment gateways
  const { data: availableGateways, isLoading: loadingGateways } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async (): Promise<PaymentGateway[]> => {
      const { data, error } = await supabase
        .from('payment_gateways' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      return (data || []) as unknown as PaymentGateway[];
    }
  });

  // Fetch tenant payment configurations
  const { data: tenantConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['tenant-payment-configs'],
    queryFn: async (): Promise<TenantPaymentConfig[]> => {
      const { data, error } = await supabase
        .from('tenant_payment_configs' as any)
        .select('*')
        .order('created_at');

      if (error) throw error;
      return (data || []) as unknown as TenantPaymentConfig[];
    }
  });

  // Save or update tenant payment configuration
  const savePaymentConfig = useMutation({
    mutationFn: async (config: Partial<TenantPaymentConfig> & { tenant_id: string; gateway_type: PaymentGatewayType }) => {
      const { data, error } = await supabase
        .from('tenant_payment_configs' as any)
        .upsert({
          tenant_id: config.tenant_id,
          gateway_type: config.gateway_type,
          is_active: config.is_active ?? true,
          is_primary: config.is_primary ?? false,
          api_keys: config.api_keys || {},
          webhook_secret: config.webhook_secret,
          configuration: config.configuration || {},
          validation_status: 'pending'
        }, {
          onConflict: 'tenant_id,gateway_type'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-configs'] });
      showSuccess('Payment gateway configuration saved successfully');
    },
    onError: (error: any) => {
      showError(`Failed to save payment configuration: ${error.message}`);
    }
  });

  // Validate gateway credentials
  const validateGatewayCredentials = useMutation({
    mutationFn: async ({ tenantId, gatewayType, credentials }: {
      tenantId: string;
      gatewayType: PaymentGatewayType;
      credentials: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke('validate-gateway-keys', {
        body: {
          tenant_id: tenantId,
          gateway_type: gatewayType,
          credentials
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        showSuccess('Gateway credentials validated successfully');
      } else {
        showError(`Validation failed: ${data.error}`);
      }
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-configs'] });
    },
    onError: (error: any) => {
      showError(`Validation failed: ${error.message}`);
    }
  });

  // Delete payment configuration
  const deletePaymentConfig = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('tenant_payment_configs' as any)
        .delete()
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-configs'] });
      showSuccess('Payment configuration deleted successfully');
    },
    onError: (error: any) => {
      showError(`Failed to delete configuration: ${error.message}`);
    }
  });

  return {
    availableGateways: availableGateways || [],
    tenantConfigs: tenantConfigs || [],
    isLoading: loadingGateways || loadingConfigs,
    savePaymentConfig,
    validateGatewayCredentials,
    deletePaymentConfig
  };
};
