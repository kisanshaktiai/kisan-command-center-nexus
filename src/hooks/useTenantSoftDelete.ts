
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SuspendTenantOptions {
  tenantId: string;
  reason?: string;
}

export interface ArchiveTenantOptions {
  tenantId: string;
  archiveLocation: string;
  encryptionKeyId: string;
}

// Type for RPC response
interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
  archive_job_id?: string;
}

export const useTenantSoftDelete = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const suspendTenant = async ({ tenantId, reason }: SuspendTenantOptions): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Suspending tenant:', { tenantId, reason });

      const { data, error } = await supabase.rpc('suspend_tenant', {
        p_tenant_id: tenantId,
        p_reason: reason || null
      });

      if (error) {
        console.error('Error suspending tenant:', error);
        toast({
          title: "Error",
          description: "Failed to suspend tenant",
          variant: "destructive",
        });
        return false;
      }

      const response = data as RpcResponse;
      if (!response?.success) {
        console.error('Suspend tenant returned error:', response?.error);
        toast({
          title: "Error",
          description: response?.error || "Failed to suspend tenant",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Tenant suspended successfully",
        variant: "default",
      });

      return true;
    } catch (error: any) {
      console.error('Exception suspending tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to suspend tenant",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateTenant = async (tenantId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Reactivating tenant:', tenantId);

      const { data, error } = await supabase.rpc('reactivate_tenant', {
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('Error reactivating tenant:', error);
        toast({
          title: "Error",
          description: "Failed to reactivate tenant",
          variant: "destructive",
        });
        return false;
      }

      const response = data as RpcResponse;
      if (!response?.success) {
        console.error('Reactivate tenant returned error:', response?.error);
        toast({
          title: "Error",
          description: response?.error || "Failed to reactivate tenant",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Tenant reactivated successfully",
        variant: "default",
      });

      return true;
    } catch (error: any) {
      console.error('Exception reactivating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate tenant",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const archiveTenant = async ({ tenantId, archiveLocation, encryptionKeyId }: ArchiveTenantOptions): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Archiving tenant:', { tenantId, archiveLocation, encryptionKeyId });

      const { data, error } = await supabase.rpc('archive_tenant_data', {
        p_tenant_id: tenantId,
        p_archive_location: archiveLocation,
        p_encryption_key_id: encryptionKeyId
      });

      if (error) {
        console.error('Error archiving tenant:', error);
        toast({
          title: "Error",
          description: "Failed to archive tenant",
          variant: "destructive",
        });
        return false;
      }

      const response = data as RpcResponse;
      if (!response?.success) {
        console.error('Archive tenant returned error:', response?.error);
        toast({
          title: "Error",
          description: response?.error || "Failed to archive tenant",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Tenant archived successfully",
        variant: "default",
      });

      return true;
    } catch (error: any) {
      console.error('Exception archiving tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to archive tenant",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suspendTenant,
    reactivateTenant,
    archiveTenant,
    isLoading
  };
};
