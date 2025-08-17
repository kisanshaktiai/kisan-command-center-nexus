
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Edit, Trash2, Users, Calendar } from "lucide-react";
import { tenantService } from "@/services/tenantService";
import { Tenant } from "@/types/tenant";
import { UserTenantStatusIndicator } from "./UserTenantStatusIndicator";
import { useUserTenantValidation } from "@/hooks/useUserTenantValidation";

interface TenantCardProps {
  tenant: Tenant;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails?: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const { 
    validateUserTenantAccess, 
    createUserTenantRelationship, 
    isValidating, 
    isCreatingRelationship 
  } = useUserTenantValidation();
  
  const [validationStatus, setValidationStatus] = useState(null);

  useEffect(() => {
    const validateAccess = async () => {
      const status = await validateUserTenantAccess(tenant.id);
      setValidationStatus(status);
    };

    validateAccess();
  }, [tenant.id, validateUserTenantAccess]);

  const handleCreateRelationship = async () => {
    const success = await createUserTenantRelationship(tenant.id, 'tenant_admin');
    if (success) {
      // Re-validate after creating relationship
      const status = await validateUserTenantAccess(tenant.id);
      setValidationStatus(status);
    }
  };

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(tenant);
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{tenant.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {tenant.slug}
              </CardDescription>
            </div>
          </div>
          <Badge variant={tenantService.getStatusBadgeVariant(tenant.status)}>
            {tenant.status?.toUpperCase()}
          </Badge>
        </div>

        {/* User-Tenant Validation Status */}
        <div className="mt-3 pt-3 border-t">
          <UserTenantStatusIndicator
            status={validationStatus}
            isValidating={isValidating}
            isCreatingRelationship={isCreatingRelationship}
            onCreateRelationship={handleCreateRelationship}
            showDetails={!validationStatus?.isValid}
            compact={false}
          />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Type and Plan */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Type:</span>
            <span className="capitalize">{tenant.type?.replace('_', ' ')}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Plan:</span>
            <Badge variant={tenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
              {tenantService.getPlanDisplayName(tenant.subscription_plan)}
            </Badge>
          </div>

          {/* Owner Email */}
          {tenant.owner_email && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Owner:</span>
              <span className="truncate max-w-32" title={tenant.owner_email}>
                {tenant.owner_email}
              </span>
            </div>
          )}

          {/* Created Date */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Created:</span>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(tenant.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tenant);
              }}
              disabled={!validationStatus?.isValid}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tenant.id);
              }}
              className="text-destructive hover:text-destructive"
              disabled={!validationStatus?.isValid}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
