
import React from 'react';
import type { Lead } from '@/types/leads';

interface LeadAnalyticsDashboardProps {
  leads?: Lead[];
  detailed?: boolean;
}

export const LeadAnalyticsDashboard: React.FC<LeadAnalyticsDashboardProps> = ({
  leads = [],
  detailed = false
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">
          Lead Analytics Dashboard
        </h3>
        <p className="text-gray-600">
          Analytics dashboard for {leads.length} leads
          {detailed && ' (detailed view)'}
        </p>
      </div>
    </div>
  );
};
