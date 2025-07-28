import React from 'react';
import { AdminInviteManager } from '@/components/super-admin/AdminInviteManager';

export default function AdminUserManagement() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin User Management</h1>
        <p className="text-gray-600 mt-2">
          Manage admin users, send invitations, and control system access
        </p>
      </div>
      
      <AdminInviteManager />
    </div>
  );
}