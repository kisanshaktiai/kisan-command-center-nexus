
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

interface AuthContextProviderProps {
  children: React.ReactNode;
}

export const AuthContextProvider: React.FC<AuthContextProviderProps> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};
