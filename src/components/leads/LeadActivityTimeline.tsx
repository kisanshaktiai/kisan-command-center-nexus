
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useLeadActivities } from '@/hooks/useLeadActivities';
import type { LeadActivity } from '@/types/leads';

interface LeadActivityTimelineProps {
  leadId: string;
  className?: string;
}

const getActivityIcon = (activityType: LeadActivity['activity_type']) => {
  switch (activityType) {
    case 'call': return <Phone className="h-4 w-4" />;
    case 'email': return <Mail className="h-4 w-4" />;
    case 'meeting': return <User className="h-4 w-4" />;
    case 'note': return <MessageSquare className="h-4 w-4" />;
    case 'task': return <CheckCircle className="h-4 w-4" />;
    case 'status_change': return <ArrowRight className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getActivityColor = (activityType: LeadActivity['activity_type']) => {
  switch (activityType) {
    case 'call': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'email': return 'text-green-600 bg-green-50 border-green-200';
    case 'meeting': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'note': return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'task': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'status_change': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const LeadActivityTimeline: React.FC<LeadActivityTimelineProps> = ({
  leadId,
  className,
}) => {
  const { data: activities = [], isLoading } = useLeadActivities(leadId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity Timeline
          <Badge variant="outline" className="ml-auto">
            {activities.length} activities
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No activities recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex gap-3">
                <div className={`p-2 rounded-full border ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      )}
                      {activity.outcome && (
                        <p className="text-xs text-green-600 mt-1">
                          <strong>Outcome:</strong> {activity.outcome}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">
                      {activity.activity_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(activity.created_at).toLocaleString()}
                    {activity.created_by_user && (
                      <span className="ml-2">
                        by {activity.created_by_user.full_name}
                      </span>
                    )}
                  </p>
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute left-6 mt-12 w-px h-4 bg-gray-200"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
