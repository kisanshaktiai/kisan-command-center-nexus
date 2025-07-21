
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Users, Package, Calendar, BarChart3 } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import { TenantDetailModal } from './TenantDetailModal';

interface TenantCardProps {
  tenant: Tenant;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({ tenant, onEdit, onDelete }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleCardClick = () => {
    setShowDetailModal(true);
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-blue-500"
        onClick={handleCardClick}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                {tenant.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {tenant.slug}
                </span>
                <Badge variant="outline" className="capitalize">
                  {tenant.type}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(tenant);
                }}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tenant);
                }}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge 
                variant={TenantService.getStatusBadgeVariant(tenant.status)}
                className="capitalize"
              >
                {tenant.status}
              </Badge>
              <Badge 
                variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}
                className="font-medium"
              >
                {TenantService.getPlanDisplayName(tenant.subscription_plan)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">
                  {tenant.max_farmers?.toLocaleString()} farmers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">
                  {tenant.max_products} products
                </span>
              </div>
            </div>

            {tenant.owner_email && (
              <div className="text-sm text-gray-600 truncate">
                <strong>Contact:</strong> {tenant.owner_email}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created: {new Date(tenant.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1 text-blue-600">
                <BarChart3 className="h-3 w-3" />
                View Details
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TenantDetailModal
        tenant={tenant}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  );
};
