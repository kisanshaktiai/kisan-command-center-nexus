
import React, { useState } from 'react';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminNotifications } from './AdminNotifications';
import { BulkAdminOperations } from './BulkAdminOperations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Bell, Upload } from 'lucide-react';

export const EnhancedAdminUserManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <p className="text-muted-foreground">
          Comprehensive admin user management with security monitoring and bulk operations
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditLog />
        </TabsContent>

        <TabsContent value="notifications">
          <AdminNotifications />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkAdminOperations />
        </TabsContent>
      </Tabs>
    </div>
  );
};
