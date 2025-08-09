
import React from 'react';
import { WorldClassLeadManagement } from '@/components/leads/WorldClassLeadManagement';

export default function LeadManagementPage() {
  return (
    <div className="space-y-6">
      {/* Compact Header - matching project design */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground text-sm">Manage and track leads through the conversion pipeline</p>
        </div>
      </div>
      
      <WorldClassLeadManagement />
    </div>
  );
}
