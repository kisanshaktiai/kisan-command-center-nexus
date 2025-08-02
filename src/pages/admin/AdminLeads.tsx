
import React from 'react';
import { LeadManagement } from '@/components/leads/LeadManagement';

export default function AdminLeads() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <LeadManagement />
      </div>
    </div>
  );
}
