import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  Star,
  MoreHorizontal,
  Eye,
  Edit,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TenantVerificationModal } from './TenantVerificationModal';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '@/types/leads';

interface LeadCardProps {
  lead: Lead;
  onViewDetails?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  onRefresh?: () => void;
  showConvertButton?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onViewDetails,
  onEdit,
  onConvert,
  onRefresh,
  showConvertButton = false
}) => {
  const [showTenantVerification, setShowTenantVerification] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: Lead['priority']) => {
    const className = "h-4 w-4";
    switch (priority) {
      case 'urgent':
        return <Star className={`${className} text-red-500 fill-red-500`} />;
      case 'high':
        return <Star className={`${className} text-orange-500 fill-orange-500`} />;
      case 'medium':
        return <Star className={`${className} text-yellow-500`} />;
      case 'low':
        return <Star className={`${className} text-gray-400`} />;
      default:
        return <Star className={`${className} text-gray-400`} />;
    }
  };

  const handleTenantInfoClick = () => {
    if (lead.status === 'converted') {
      setShowTenantVerification(true);
    }
  };

  const handleConversionSuccess = () => {
    onRefresh?.();
    setShowTenantVerification(false);
    setShowConvertDialog(false);
  };

  const handleConvertClick = () => {
    setShowConvertDialog(true);
  };

  return (
    <>
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                {lead.contact_name}
              </CardTitle>
              {lead.organization_name && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building className="h-4 w-4" />
                  {lead.organization_name}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getPriorityIcon(lead.priority)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(lead)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Lead
                  </DropdownMenuItem>
                  {lead.status === 'qualified' && (
                    <DropdownMenuItem onClick={() => onConvert?.(lead)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Convert to Tenant
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{lead.email}</span>
          </div>

          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{lead.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Created: {new Date(lead.created_at).toLocaleDateString()}
            </span>
          </div>

          {lead.assigned_admin && (
            <div className="text-sm">
              <span className="text-muted-foreground">Assigned to: </span>
              <span className="font-medium">{lead.assigned_admin.full_name}</span>
            </div>
          )}

          {lead.qualification_score > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Score: </span>
              <span className="font-medium">{lead.qualification_score}/100</span>
            </div>
          )}

          {lead.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              <span className="text-gray-700 line-clamp-2">{lead.notes}</span>
            </div>
          )}

          {/* Tenant Information for Converted Leads */}
          {lead.status === 'converted' && lead.converted_tenant_id && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Converted to Tenant</span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <div>Tenant ID: {lead.converted_tenant_id.slice(0, 8)}...</div>
                {lead.converted_at && (
                  <div>Converted: {new Date(lead.converted_at).toLocaleDateString()}</div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-white hover:bg-green-50 border-green-300"
                  onClick={handleTenantInfoClick}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Verify Tenant Status
                </Button>
                {showConvertButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                    onClick={handleConvertClick}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Convert Again
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3">
          <div className="flex items-center justify-between w-full">
            <Badge className={getStatusColor(lead.status)}>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </Badge>
            
            <div className="flex items-center gap-2">
              {lead.source && (
                <Badge variant="outline" className="text-xs">
                  {lead.source}
                </Badge>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>

      <TenantVerificationModal
        isOpen={showTenantVerification}
        onClose={() => setShowTenantVerification(false)}
        lead={lead}
        onConversionSuccess={handleConversionSuccess}
      />

      <ConvertLeadDialog
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        lead={lead}
        onSuccess={handleConversionSuccess}
      />
    </>
  );
};
