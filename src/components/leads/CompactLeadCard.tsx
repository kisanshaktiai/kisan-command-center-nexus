
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Building, 
  UserCheck, 
  ArrowRight,
  Target
} from 'lucide-react';
import type { Lead } from '@/types/leads';

interface CompactLeadCardProps {
  lead: Lead;
  onReassign: (leadId: string) => void;
  onConvert: (leadId: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  onRefresh?: () => void;
}

export const CompactLeadCard: React.FC<CompactLeadCardProps> = ({
  lead,
  onReassign,
  onConvert,
  isSelected = false,
  onSelect,
  onRefresh
}) => {
  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canConvert = lead.status === 'qualified';

  return (
    <Card className={`mb-2 transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''} hover:shadow-md`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
          )}
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-sm truncate">{lead.contact_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1 py-0 ${getPriorityColor(lead.priority)}`}
                >
                  {lead.priority}
                </Badge>
                {lead.qualification_score > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0 flex items-center gap-1">
                    <Target className="h-2 w-2" />
                    {lead.qualification_score}
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-1 mb-2">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Mail className="h-3 w-3" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.organization_name && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Building className="h-3 w-3" />
                  <span className="truncate">{lead.organization_name}</span>
                </div>
              )}
            </div>

            {/* Assignment Info */}
            {lead.assigned_admin && (
              <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                <span className="truncate">{lead.assigned_admin.full_name}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReassign(lead.id)}
                disabled={lead.status === 'converted'}
                className="h-6 text-xs px-2"
              >
                {lead.assigned_admin ? 'Reassign' : 'Assign'}
              </Button>

              {canConvert && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onConvert(lead.id)}
                  className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Convert
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
