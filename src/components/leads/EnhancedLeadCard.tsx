
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  UserCheck, 
  MessageSquare,
  Target,
  Zap,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { EnhancedLeadStatusSelect } from './EnhancedLeadStatusSelect';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '@/types/leads';

interface EnhancedLeadCardProps {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  isDragging?: boolean;
  onStatusUpdate: (leadId: string, status: Lead['status'], notes?: string) => Promise<void>;
}

export const EnhancedLeadCard: React.FC<EnhancedLeadCardProps> = ({
  lead,
  isSelected,
  onSelect,
  isDragging = false,
  onStatusUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const daysSince = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <>
      <Card 
        className={`
          relative group cursor-pointer transition-all duration-300 hover:shadow-lg
          ${isDragging ? 'shadow-2xl bg-white border-2 border-blue-400' : ''}
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
          ${lead.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}
          ${lead.priority === 'high' ? 'border-l-4 border-l-orange-500' : ''}
        `}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm flex items-center gap-1 truncate">
                  <User className="h-3 w-3 flex-shrink-0" />
                  {lead.contact_name}
                </h3>
                <p className="text-xs text-gray-600 truncate">{lead.email}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge 
                variant="outline" 
                className={`text-xs ${getPriorityColor(lead.priority)}`}
              >
                {lead.priority}
              </Badge>
              {lead.qualification_score > 0 && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getScoreColor(lead.qualification_score)}`}
                >
                  <Star className="h-2 w-2 mr-1" />
                  {lead.qualification_score}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {/* Contact Information */}
          {lead.phone && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          
          {lead.organization_name && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Building className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{lead.organization_name}</span>
            </div>
          )}

          {/* Source and Date */}
          <div className="flex items-center justify-between text-xs gap-2">
            {lead.source && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {lead.source}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(lead.created_at)}</span>
            </div>
          </div>

          {/* Assignment Info */}
          {lead.assigned_admin && (
            <div className="text-xs bg-blue-50 rounded p-2">
              <div className="flex items-center gap-1 text-blue-700">
                <UserCheck className="h-3 w-3" />
                <span className="font-medium truncate">{lead.assigned_admin.full_name}</span>
              </div>
              {lead.assigned_at && (
                <div className="text-blue-600 mt-1">
                  Assigned {daysSince(lead.assigned_at)} days ago
                </div>
              )}
            </div>
          )}

          {/* Last Activity */}
          {lead.last_contact_at && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last contact: {formatDate(lead.last_contact_at)}</span>
            </div>
          )}

          {/* Notes Preview */}
          {lead.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
              <p className="line-clamp-2">{lead.notes}</p>
            </div>
          )}

          {/* Status Management */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <EnhancedLeadStatusSelect
              lead={lead}
              onStatusChange={onStatusUpdate}
              disabled={false}
            />
            
            {/* Quick Actions */}
            <div className="flex gap-1">
              {lead.status === 'qualified' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvertDialogOpen(true);
                  }}
                  title="Convert to Tenant"
                >
                  <Zap className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                title="Show Details"
              >
                <TrendingUp className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-gray-600">Score:</span>
                  <span className="ml-1">{lead.qualification_score || 0}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Days:</span>
                  <span className="ml-1">{daysSince(lead.created_at)}</span>
                </div>
              </div>
              
              {lead.next_follow_up_at && (
                <div>
                  <span className="font-medium text-gray-600">Next Follow-up:</span>
                  <span className="ml-1">{formatDate(lead.next_follow_up_at)}</span>
                </div>
              )}

              {lead.budget_range && (
                <div>
                  <span className="font-medium text-gray-600">Budget:</span>
                  <span className="ml-1">{lead.budget_range}</span>
                </div>
              )}

              {lead.company_size && (
                <div>
                  <span className="font-medium text-gray-600">Company Size:</span>
                  <span className="ml-1">{lead.company_size}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConvertLeadDialog
        open={convertDialogOpen}
        onClose={() => setConvertDialogOpen(false)}
        lead={lead}
      />
    </>
  );
};
