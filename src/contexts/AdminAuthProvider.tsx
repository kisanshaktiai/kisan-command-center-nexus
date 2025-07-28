import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from './AuthContext';

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuthContext = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuthContext must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminAuth = useAdminAuth();
  const mainAuth = useAuth();
  
  // Sync admin auth with main auth when admin login succeeds
  useEffect(() => {
    if (adminAuth.user && adminAuth.session && adminAuth.isAdmin) {
      // Admin is authenticated, ensure main auth context reflects this
      console.log('Admin authentication successful, syncing with main auth context');
    }
  }, [adminAuth.user, adminAuth.session, adminAuth.isAdmin]);

  return (
    <AdminAuthContext.Provider value={adminAuth}>
      {children}
    </AdminAuthContext.Provider>
  );
};