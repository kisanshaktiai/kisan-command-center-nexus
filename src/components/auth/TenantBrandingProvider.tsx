import React, { createContext, useContext, useState, useEffect } from 'react';

interface TenantBranding {
  primaryColor: string;
  logoUrl?: string;
  organizationName: string;
  customStyles?: Record<string, string>;
}

interface TenantBrandingContextType {
  branding: TenantBranding;
  setBranding: (branding: TenantBranding) => void;
  applyBranding: () => void;
}

const TenantBrandingContext = createContext<TenantBrandingContextType | undefined>(undefined);

const defaultBranding: TenantBranding = {
  primaryColor: '#2563eb',
  organizationName: 'KisanShaktiAI',
  logoUrl: undefined
};

export const TenantBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);

  const applyBranding = () => {
    // Apply custom CSS variables for branding
    const root = document.documentElement;
    root.style.setProperty('--primary-brand', branding.primaryColor);
    root.style.setProperty('--primary-brand-rgb', hexToRgb(branding.primaryColor));
    
    // Apply any custom styles
    if (branding.customStyles) {
      Object.entries(branding.customStyles).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  };

  useEffect(() => {
    applyBranding();
  }, [branding]);

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '37, 99, 235'; // fallback
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  };

  return (
    <TenantBrandingContext.Provider value={{ branding, setBranding, applyBranding }}>
      {children}
    </TenantBrandingContext.Provider>
  );
};

export const useTenantBranding = () => {
  const context = useContext(TenantBrandingContext);
  if (context === undefined) {
    throw new Error('useTenantBranding must be used within a TenantBrandingProvider');
  }
  return context;
};