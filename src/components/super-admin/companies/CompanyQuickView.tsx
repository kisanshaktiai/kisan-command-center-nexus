import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  Mail, 
  Phone, 
  Globe,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  Edit,
  RefreshCw
} from 'lucide-react';

interface CompanyQuickViewProps {
  company: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (company: any) => void;
  onConvertToTenant: (company: any) => void;
}

export const CompanyQuickView: React.FC<CompanyQuickViewProps> = ({
  company,
  isOpen,
  onClose,
  onEdit,
  onConvertToTenant,
}) => {
  if (!company) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'verified':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{company.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{company.slug}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Status and Type */}
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(company.status)}>
              {company.status === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
              {company.status}
            </Badge>
            <Badge variant="secondary">{company.company_type || 'Other'}</Badge>
            {company.is_potential_tenant && (
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white">
                Potential Tenant
              </Badge>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2">
              {company.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{company.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Business Information */}
          <div>
            <h3 className="font-semibold mb-3">Business Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {company.gst_number && (
                <div>
                  <p className="text-sm text-muted-foreground">GST Number</p>
                  <p className="font-mono">{company.gst_number}</p>
                </div>
              )}
              {company.pan_number && (
                <div>
                  <p className="text-sm text-muted-foreground">PAN Number</p>
                  <p className="font-mono">{company.pan_number}</p>
                </div>
              )}
              {company.founded_year && (
                <div>
                  <p className="text-sm text-muted-foreground">Founded</p>
                  <p>{company.founded_year}</p>
                </div>
              )}
              {company.annual_revenue && (
                <div>
                  <p className="text-sm text-muted-foreground">Annual Revenue</p>
                  <p>₹{company.annual_revenue.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {company.address && (
            <div>
              <h3 className="font-semibold mb-3">Address</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  {company.address.street && <p>{company.address.street}</p>}
                  {company.address.city && company.address.state && (
                    <p>{company.address.city}, {company.address.state}</p>
                  )}
                  {company.address.country && company.address.postal_code && (
                    <p>{company.address.country} - {company.address.postal_code}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Certifications */}
          {company.certifications && company.certifications.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {company.certifications.map((cert: string, index: number) => (
                  <Badge key={index} variant="outline">
                    <FileText className="mr-1 h-3 w-3" />
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {company.description && (
            <div>
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-sm text-muted-foreground">{company.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-sm text-muted-foreground">
            <p>Created: {new Date(company.created_at).toLocaleString()}</p>
            <p>Last Updated: {new Date(company.updated_at).toLocaleString()}</p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={() => onEdit(company)} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit Company
            </Button>
            {company.is_potential_tenant && (
              <Button 
                onClick={() => onConvertToTenant(company)}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Convert to Tenant
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};