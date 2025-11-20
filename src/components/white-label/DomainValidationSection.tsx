import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface DomainValidationSectionProps {
  domain: string;
  onDomainChange: (domain: string) => void;
  type: 'subdomain' | 'custom_domain';
  tenantId?: string;
  domainPurpose?: 'public_website' | 'tenant_portal' | 'farmer_app';
}

export const DomainValidationSection: React.FC<DomainValidationSectionProps> = ({
  domain,
  onDomainChange,
  type,
  tenantId,
  domainPurpose = 'tenant_portal'
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    code?: string;
  } | null>(null);
  
  const debouncedDomain = useDebounce(domain, 500);

  useEffect(() => {
    if (!debouncedDomain) {
      setValidationResult(null);
      return;
    }

    validateDomain(debouncedDomain);
  }, [debouncedDomain, tenantId]);

  const validateDomain = async (domainToValidate: string) => {
    setIsChecking(true);
    
    try {
      if (type === 'subdomain') {
        // Validate subdomain format and availability
        const { data, error } = await supabase.rpc('check_slug_availability', {
          p_slug: domainToValidate,
          p_tenant_id: tenantId || null
        });

        if (error) throw error;

        const result = data as any;
        setValidationResult({
          valid: result?.available || false,
          message: result?.message || result?.error || 'Invalid subdomain',
          code: result?.code
        });
      } else {
        // Validate custom domain format
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        const isValid = domainRegex.test(domainToValidate);
        
        if (!isValid) {
          setValidationResult({
            valid: false,
            message: 'Invalid domain format',
            code: 'INVALID_FORMAT'
          });
        } else {
          // Check if domain is already in use (check all domain types)
          const { data, error } = await supabase
            .from('tenants')
            .select('id')
            .or(`custom_domain.eq.${domainToValidate},subdomain.eq.${domainToValidate}`)
            .neq('id', tenantId || '')
            .limit(1);

          if (error) {
            throw error;
          }

          setValidationResult({
            valid: !data || data.length === 0,
            message: (data && data.length > 0) ? 'Domain is already in use' : 'Domain is available',
            code: (data && data.length > 0) ? 'ALREADY_IN_USE' : 'AVAILABLE'
          });
        }
      }
    } catch (error) {
      console.error('Domain validation error:', error);
      setValidationResult({
        valid: false,
        message: 'Failed to validate domain',
        code: 'ERROR'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (!validationResult) return null;
    
    if (validationResult.valid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (validationResult.code === 'ALREADY_EXISTS' || validationResult.code === 'ALREADY_IN_USE') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!validationResult || isChecking) return null;
    
    return (
      <Badge 
        variant={validationResult.valid ? 'success' : 'destructive'}
        className="text-xs"
      >
        {validationResult.message}
      </Badge>
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={type}>
        {type === 'subdomain' ? 'Subdomain' : 'Custom Domain'}
      </Label>
      <div className="relative">
        <Input
          id={type}
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          placeholder={type === 'subdomain' ? 'yourcompany' : 'app.yourcompany.com'}
          className={`pr-10 ${
            validationResult && !isChecking
              ? validationResult.valid
                ? 'border-green-500 focus:ring-green-500'
                : 'border-red-500 focus:ring-red-500'
              : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>
      {type === 'subdomain' && (
        <p className="text-xs text-muted-foreground">
          Your app will be available at: <strong>{domain || 'yourcompany'}.kisanshakti.app</strong>
        </p>
      )}
      {getStatusBadge()}
    </div>
  );
};