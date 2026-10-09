import React from 'react';
import { AdminAccessManager } from '@/components/super-admin/AdminAccessManager';

export default function AdminUserManagement() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-foreground">Admin User Management</h1>
        <p className="text-muted-foreground mt-2">
          Invite administrators, control their role and portal access, and track every invitation
        </p>
      </div>
      <AdminAccessManager />
    </div>
  );
}
