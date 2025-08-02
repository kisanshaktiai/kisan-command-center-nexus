
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';

interface TestAssignmentResult {
  test_lead_id: string;
  assigned_to: string | null;
  assigned_at: string | null;
  status: string;
  super_admin_count: number;
  active_rules_count: number;
  assignment_successful: boolean;
}

export const useLeadAutoAssignment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const testAutoAssignment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('test_lead_auto_assignment');
      
      if (error) {
        console.error('Test auto-assignment error:', error);
        showError('Failed to test auto-assignment', { description: error.message });
        return null;
      }

      console.log('Auto-assignment test result:', data);
      
      const result = data as TestAssignmentResult;
      
      if (result?.assignment_successful) {
        showSuccess('Auto-assignment test successful', {
          description: `Lead would be assigned to a super admin. Found ${result.super_admin_count} super admin(s) and ${result.active_rules_count} active rule(s).`
        });
      } else {
        showError('Auto-assignment test failed', {
          description: `No assignment occurred. Super admins available: ${result?.super_admin_count || 0}, Active rules: ${result?.active_rules_count || 0}`
        });
      }

      return result;
    } catch (error) {
      console.error('Unexpected error during auto-assignment test:', error);
      showError('Unexpected error during test');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getAssignmentStats = async () => {
    try {
      // Get super admin count
      const { data: superAdmins, error: adminError } = await supabase
        .from('admin_users')
        .select('id, full_name, email')
        .eq('role', 'super_admin')
        .eq('is_active', true);

      if (adminError) throw adminError;

      // Get active assignment rules
      const { data: assignmentRules, error: rulesError } = await supabase
        .from('lead_assignment_rules')
        .select('id, rule_name, rule_type, admin_pool, is_active')
        .eq('is_active', true);

      if (rulesError) throw rulesError;

      // Get recent assignments
      const { data: recentAssignments, error: assignmentsError } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          assigned_to,
          assignment_type,
          assignment_reason,
          assigned_at,
          admin_users!assigned_to(full_name, email)
        `)
        .order('assigned_at', { ascending: false })
        .limit(10);

      if (assignmentsError) throw assignmentsError;

      return {
        superAdmins: superAdmins || [],
        assignmentRules: assignmentRules || [],
        recentAssignments: recentAssignments || [],
        stats: {
          superAdminCount: superAdmins?.length || 0,
          activeRulesCount: assignmentRules?.length || 0,
          recentAssignmentsCount: recentAssignments?.length || 0
        }
      };
    } catch (error) {
      console.error('Error fetching assignment stats:', error);
      showError('Failed to fetch assignment statistics');
      return null;
    }
  };

  return {
    testAutoAssignment,
    getAssignmentStats,
    isLoading
  };
};
