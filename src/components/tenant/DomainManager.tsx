
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMultiTenant } from '@/hooks/useMultiTenant';

interface DomainConfig {
  id: string;
  domain: string;
  type: 'subdomain' | 'custom';
  status: 'active' | 'pending' | 'failed';
  ssl_status: 'valid' | 'pending' | 'invalid';
}

export function DomainManager() {
  const { tenant } = useMultiTenant();
  const [domains, setDomains] = useState<DomainConfig[]>([
    {
      id: '1',
      domain: 'demo.kisanshakti.com',
      type: 'subdomain',
      status: 'active',
      ssl_status: 'valid',
    },
  ]);
  const [newDomain, setNewDomain] = useState('');
  const [domainType, setDomainType] = useState<'subdomain' | 'custom'>('custom');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setIsAdding(true);
    try {
      // Simulate domain addition
      const newDomainConfig: DomainConfig = {
        id: Date.now().toString(),
        domain: newDomain,
        type: domainType,
        status: 'pending',
        ssl_status: 'pending',
      };

      setDomains(prev => [...prev, newDomainConfig]);
      setNewDomain('');
      toast.success('Domain added successfully');
      
      // Simulate domain verification after 2 seconds
      setTimeout(() => {
        setDomains(prev => 
          prev.map(d => 
            d.id === newDomainConfig.id 
              ? { ...d, status: 'active', ssl_status: 'valid' }
              : d
          )
        );
        toast.success('Domain verified and SSL certificate issued');
      }, 2000);
    } catch (error) {
      toast.error('Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    try {
      setDomains(prev => prev.filter(d => d.id !== domainId));
      toast.success('Domain removed successfully');
    } catch (error) {
      toast.error('Failed to remove domain');
    }
  };

  const getStatusBadge = (status: DomainConfig['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getSSLBadge = (ssl_status: DomainConfig['ssl_status']) => {
    switch (ssl_status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <Check className="w-3 h-3" /> SSL Valid
        </Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">SSL Pending</Badge>;
      case 'invalid':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> SSL Invalid
        </Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Domain Management
        </CardTitle>
        <CardDescription>
          Manage custom domains and subdomains for your tenant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium">Current Domains</h4>
          {domains.length === 0 ? (
            <p className="text-sm text-gray-500">No domains configured</p>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{domain.domain}</span>
                      <Badge variant="outline">{domain.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(domain.status)}
                      {getSSLBadge(domain.ssl_status)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDomain(domain.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Domain
          </h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="domain-type">Domain Type</Label>
              <select
                id="domain-type"
                value={domainType}
                onChange={(e) => setDomainType(e.target.value as 'subdomain' | 'custom')}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="custom">Custom Domain</option>
                <option value="subdomain">Subdomain</option>
              </select>
            </div>
            <div>
              <Label htmlFor="new-domain">
                {domainType === 'custom' ? 'Custom Domain' : 'Subdomain'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="new-domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder={
                    domainType === 'custom' 
                      ? 'yourdomain.com' 
                      : 'yourcompany'
                  }
                />
                {domainType === 'subdomain' && (
                  <span className="flex items-center px-3 text-sm text-gray-500">
                    .kisanshakti.com
                  </span>
                )}
              </div>
            </div>
            <Button 
              onClick={handleAddDomain} 
              disabled={isAdding || !newDomain.trim()}
              className="w-full"
            >
              {isAdding ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </div>

        {domainType === 'custom' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">DNS Configuration Required</h5>
            <p className="text-sm text-blue-700 mb-3">
              To use a custom domain, add these DNS records to your domain provider:
            </p>
            <div className="space-y-2 text-sm font-mono">
              <div className="bg-white p-2 rounded border">
                <strong>CNAME:</strong> @ → your-tenant.kisanshakti.com
              </div>
              <div className="bg-white p-2 rounded border">
                <strong>TXT:</strong> _verification → tenant-{tenant?.tenant_id}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
