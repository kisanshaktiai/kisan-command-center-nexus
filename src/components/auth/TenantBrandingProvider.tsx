
import React, { createContext, useContext, useState, useEffect } from 'react';

interface TenantBranding {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  appName: string;
  customStyles?: Record<string, string>;
}

interface TenantBrandingContextType {
  branding: TenantBranding;
  setBranding: (branding: TenantBranding) => void;
  applyBranding: () => void;
}

const TenantBrandingContext = createContext<TenantBrandingContextType | undefined>(undefined);

const defaultBranding: TenantBranding = {
  primaryColor: '#10B981',
  secondaryColor: '#065F46',
  accentColor: '#F59E0B',
  appName: 'KisanShakti AI',
  logoUrl: undefined
};

export const TenantBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);

  const applyBranding = () => {
    try {
      // Apply custom CSS variables for branding
      const root = document.documentElement;
      
      // Primary color and variations
      root.style.setProperty('--primary-brand', branding.primaryColor);
      root.style.setProperty('--primary-brand-rgb', hexToRgb(branding.primaryColor));
      
      // Secondary and accent colors
      if (branding.secondaryColor) {
        root.style.setProperty('--secondary-brand', branding.secondaryColor);
        root.style.setProperty('--secondary-brand-rgb', hexToRgb(branding.secondaryColor));
      }
      
      if (branding.accentColor) {
        root.style.setProperty('--accent-brand', branding.accentColor);
        root.style.setProperty('--accent-brand-rgb', hexToRgb(branding.accentColor));
      }
      
      // Update document title
      if (branding.appName) {
        document.title = branding.appName;
      }
      
      // Update favicon if logo exists
      if (branding.logoUrl) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = branding.logoUrl;
        } else {
          // Create favicon if it doesn't exist
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = branding.logoUrl;
          document.head.appendChild(newFavicon);
        }
      }
      
      // Apply any custom styles
      if (branding.customStyles) {
        Object.entries(branding.customStyles).forEach(([property, value]) => {
          root.style.setProperty(property, value);
        });
      }
      
      console.log('Tenant branding applied successfully:', branding);
    } catch (error) {
      console.error('Error applying tenant branding:', error);
    }
  };

  useEffect(() => {
    applyBranding();
  }, [branding]);

  const hexToRgb = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex codes
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      console.warn('Invalid hex color:', hex);
      return '16, 185, 129'; // fallback to primary green
    }
    
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
