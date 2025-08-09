
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Pause, 
  Play,
  Building,
  Users,
  Calendar,
  Database 
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantMetrics } from '@/types/tenantView';
import { FormattedTenantData } from '@/services/TenantDisplayService';

interface TenantCardRefacturedProps {
  tenant: Tenant;
  formattedData: FormattedTenantData;
  size: 'small' | 'large' | 'analytics';
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  metrics?: TenantMetrics;
  showAnalytics?: boolean;
}

export const TenantCardRefactored: React.FC<TenantCardRefacturedProps> = ({
  tenant,
  formattedData,
  size,
  onEdit,
  onDelete,
  onViewDetails,
  metrics,
  showAnalytics = false
}) => {
  const isSuspended = tenant.status === 'suspended';
  
  const handleSuspendAction = () => {
    if (window.confirm(
      isSuspended 
        ? 'Are you sure you want to reactivate this tenant?' 
        : 'Are you sure you want to suspend this tenant? This action can be reversed.'
    )) {
      onDelete(); // This now handles suspension/reactivation
    }
  };

  const ActionMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Tenant
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSuspendAction}
          className={isSuspended ? "text-green-600" : "text-orange-600"}
        >
          {isSuspended ? (
            <>
              <Play className="mr-2 h-4 w-4" />
              Reactivate
            </>
          ) : (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Suspend
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (size === 'large') {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold truncate">{formattedData.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {formattedData.ownerEmail}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formattedData.statusBadgeVariant as any}>
              {formattedData.displayStatus}
            </Badge>
            <ActionMenu />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Type: {formattedData.displayType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span>Plan: {formattedData.planDisplayName}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created: {formattedData.formattedCreatedAt.split(' ')[0]}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Farmers: {formattedData.limitsDisplay.farmers}
              </div>
            </div>
          </div>
          
          {isSuspended && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                This tenant is currently suspended. Data will be archived after 30 days of suspension.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold truncate">{formattedData.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {formattedData.ownerEmail}
            </p>
          </div>
          <ActionMenu />
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={formattedData.statusBadgeVariant as any} className="text-xs">
            {formattedData.displayStatus}
          </Badge>
          <Badge variant={formattedData.planBadgeVariant as any} className="text-xs">
            {formattedData.planDisplayName}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span>{formattedData.displayType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Farmers:</span>
            <span>{formattedData.limitsDisplay.farmers}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Storage:</span>
            <span>{formattedData.limitsDisplay.storage}</span>
          </div>
        </div>
        
        {isSuspended && (
          <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
            Suspended - Will archive after 30 days
          </div>
        )}
        
        {showAnalytics && metrics && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">Health Score</div>
            <div className="text-sm font-semibold">{metrics.healthScore}/100</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
