
import React from 'react';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import TenantEditModal from '@/components/tenant/TenantEditModal';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';

interface TenantPageModalsProps {
  // Details modal
  detailsTenant: Tenant | null;
  isDetailsModalOpen: boolean;
  onCloseDetails: () => void;
  onDetailsEdit: (tenant: Tenant) => void;

  // Edit modal
  editingTenant: Tenant | null;
  isEditModalOpen: boolean;
  onCloseEdit: () => void;
  onSaveTenant: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
}

export const TenantPageModals: React.FC<TenantPageModalsProps> = ({
  detailsTenant,
  isDetailsModalOpen,
  onCloseDetails,
  onDetailsEdit,
  editingTenant,
  isEditModalOpen,
  onCloseEdit,
  onSaveTenant
}) => {
  return (
    <>
      <TenantDetailsModal
        tenant={detailsTenant}
        isOpen={isDetailsModalOpen}
        onClose={onCloseDetails}
        onEdit={onDetailsEdit}
      />

      <TenantEditModal
        tenant={editingTenant}
        isOpen={isEditModalOpen}
        onClose={onCloseEdit}
        onSave={onSaveTenant}
      />
    </>
  );
};
