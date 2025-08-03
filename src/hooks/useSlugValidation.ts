
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSlugValidation = (slug: string, currentTenantId?: string) => {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateSlug = async () => {
      if (!slug || slug.trim() === '') {
        setIsValid(false);
        setError(null);
        return;
      }

      setIsChecking(true);
      setError(null);

      try {
        console.log('Validating slug:', slug, 'with tenant ID:', currentTenantId);
        const { data, error } = await supabase.rpc('check_slug_availability', { 
          p_slug: slug,
          p_tenant_id: currentTenantId || null
        });

        if (error) {
          console.error('Slug validation error:', error);
          setError('Failed to validate slug');
          setIsValid(false);
        } else {
          console.log('Slug validation response:', data);
          const result = data as { available: boolean; error?: string };
          setIsValid(result.available);
          if (!result.available) {
            setError(result.error || 'Slug is not available');
          }
        }
      } catch (err) {
        console.error('Slug validation exception:', err);
        setError('Failed to validate slug');
        setIsValid(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce the validation
    const timeoutId = setTimeout(validateSlug, 300);
    return () => clearTimeout(timeoutId);
  }, [slug, currentTenantId]);

  return { isValid, isChecking, error };
};
