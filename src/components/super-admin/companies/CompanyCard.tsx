import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Edit, 
  Trash2, 
  Eye, 
  RefreshCw,
  CheckCircle,
  Globe,
  Phone,
  Mail,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CompanyCardProps {
  company: any;
  onEdit: (company: any) => void;
  onDelete: (id: string) => void;
  onView: (company: any) => void;
  onConvertToTenant: (company: any) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  onEdit,
  onDelete,
  onView,
  onConvertToTenant,
  isSelected = false,
  onSelect,
}) => {
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

  const getTypeColor = (type: string | null) => {
    const typeValue = type || 'other';
    switch (typeValue) {
      case 'manufacturer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'distributor':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'retailer':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      case 'supplier':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(company.id)}
            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
        </div>
      )}

      {/* Quick Actions Menu */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(company)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(company)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {company.is_potential_tenant && (
              <DropdownMenuItem onClick={() => onConvertToTenant(company)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Convert to Tenant
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(company.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="pt-6">
        {/* Company Icon and Name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{company.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{company.slug}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusColor(company.status)}>
            {company.status === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
            {company.status}
          </Badge>
          <Badge className={getTypeColor(company.company_type)}>
            {company.company_type || 'Other'}
          </Badge>
          {company.is_potential_tenant && (
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white">
              Potential Tenant
            </Badge>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-2 text-sm">
          {company.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{company.email}</span>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <a 
                href={company.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="truncate hover:text-primary transition-colors"
              >
                {company.website}
              </a>
            </div>
          )}
        </div>

        {/* Business Info */}
        {(company.gst_number || company.pan_number) && (
          <div className="mt-4 pt-4 border-t space-y-1 text-sm">
            {company.gst_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST:</span>
                <span className="font-mono">{company.gst_number}</span>
              </div>
            )}
            {company.pan_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">PAN:</span>
                <span className="font-mono">{company.pan_number}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <div className="flex gap-2 w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onView(company)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(company)}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};