
import React, { memo, useCallback } from 'react';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantViewToggle } from '@/components/tenant/TenantViewToggle';
import { TenantViewPreferences } from '@/types/tenantView';

interface TenantViewControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  viewPreferences: TenantViewPreferences;
  setViewPreferences: (preferences: TenantViewPreferences) => void;
  totalCount: number;
}

const TenantViewControls = memo<TenantViewControlsProps>(({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  viewPreferences,
  setViewPreferences,
  totalCount
}) => {
  const handlePreferencesChange = useCallback((preferences: TenantViewPreferences) => {
    setViewPreferences(preferences);
  }, [setViewPreferences]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1">
        <TenantFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterType={filterType}
          setFilterType={setFilterType}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
      </div>
      <TenantViewToggle
        preferences={viewPreferences}
        onPreferencesChange={handlePreferencesChange}
        totalCount={totalCount}
      />
    </div>
  );
});

TenantViewControls.displayName = 'TenantViewControls';

export { TenantViewControls };
