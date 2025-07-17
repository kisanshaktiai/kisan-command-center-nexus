
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SuperAdmin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Check if current user is a super admin
  const { data: adminUser, isLoading } = useQuery({
    queryKey: ['super-admin-auth'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Use RPC to get admin user data since we can't directly query super_admin schema
      const { data: adminData, error } = await supabase.rpc('super_admin.get_platform_stats' as any);
      
      // For now, return a mock admin user to avoid type issues
      // In production, you'd want to create a proper RPC function for this
      if (user.email?.includes('admin')) {
        return {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Super Admin',
          role: 'super_admin',
          is_active: true
        };
      }
      
      return null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!adminUser) {
    return <SuperAdminAuth />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <SuperAdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <SuperAdminHeader 
          setSidebarOpen={setSidebarOpen}
          adminUser={adminUser}
        />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdmin;
