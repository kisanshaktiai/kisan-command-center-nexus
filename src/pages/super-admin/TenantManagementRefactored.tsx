
import React from 'react';
import { TenantManagementPage } from '@/features/tenant/components/TenantManagementPage';

// This page now simply imports the refactored component
const TenantManagementRefactored: React.FC = () => {
  return <TenantManagementPage />;
};

export default TenantManagementRefactored;
