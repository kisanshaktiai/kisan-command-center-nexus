
import React from 'react';
import { AdminRegistrationsTable } from '@/components/admin/AdminRegistrationsTable';
import TenantManagementPage from '@/features/tenant/components/TenantManagementPage';

// This page now includes both tenant management and admin registrations
const TenantManagementRefactored: React.FC = () => {
  return (
    <div className="space-y-6">
      <AdminRegistrationsTable />
      <TenantManagementPage />
    </div>
  );
};

export default TenantManagementRefactored;
