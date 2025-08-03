
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Users, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import { useLeadAutoAssignment } from '@/hooks/useLeadAutoAssignment';

export const LeadAutoAssignmentTester: React.FC = () => {
  const { testAutoAssignment, getAssignmentStats, isLoading } = useLeadAutoAssignment();
  const [stats, setStats] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const statsData = await getAssignmentStats();
    setStats(statsData);
  };

  const handleTest = async () => {
    const result = await testAutoAssignment();
    setTestResult(result);
    // Reload stats after test
    await loadStats();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Auto-Assignment Testing & Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Super Admins Status */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {stats.stats.superAdminCount}
                </div>
                <div className="text-sm text-blue-600">Active Super Admins</div>
              </div>
            </div>

            {/* Assignment Rules Status */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Settings className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {stats.stats.activeRulesCount}
                </div>
                <div className="text-sm text-green-600">Active Rules</div>
              </div>
            </div>

            {/* Recent Assignments */}
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-700">
                  {stats.stats.recentAssignmentsCount}
                </div>
                <div className="text-sm text-orange-600">Recent Assignments</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stats.stats.superAdminCount > 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Auto-Assignment Ready
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  No Super Admins Available
                </Badge>
              )}
            </div>
            
            <Button 
              onClick={handleTest} 
              disabled={isLoading || stats.stats.superAdminCount === 0}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {isLoading ? 'Testing...' : 'Test Auto-Assignment'}
            </Button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Latest Test Result:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Assignment Success:</strong>{' '}
                  {testResult.assignment_successful ? (
                    <span className="text-green-600">✓ Success</span>
                  ) : (
                    <span className="text-red-600">✗ Failed</span>
                  )}
                </div>
                <div>
                  <strong>Test Time:</strong> {new Date().toLocaleTimeString()}
                </div>
                <div>
                  <strong>Super Admins Found:</strong> {testResult.super_admin_count}
                </div>
                <div>
                  <strong>Active Rules:</strong> {testResult.active_rules_count}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Super Admins List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Available Super Admins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.superAdmins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.superAdmins.map((admin: any) => (
                <div key={admin.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-8 w-8 text-gray-600" />
                  <div>
                    <div className="font-medium">{admin.full_name || 'Unnamed Admin'}</div>
                    <div className="text-sm text-gray-600">{admin.email}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No active super admins found</p>
              <p className="text-sm">Please create super admin accounts for auto-assignment to work</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Auto-Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAssignments.length > 0 ? (
            <div className="space-y-3">
              {stats.recentAssignments.map((assignment: any) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      Lead: {assignment.lead_id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-600">
                      Assigned to: {assignment.admin_users?.full_name || 'Unknown Admin'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {assignment.assignment_reason}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <Badge 
                      variant={assignment.assignment_type === 'auto' ? 'default' : 'secondary'}
                      className="mb-1"
                    >
                      {assignment.assignment_type}
                    </Badge>
                    <div className="text-gray-500">
                      {formatDate(assignment.assigned_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No recent assignments found</p>
              <p className="text-sm">Auto-assignments will appear here once leads are created</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
