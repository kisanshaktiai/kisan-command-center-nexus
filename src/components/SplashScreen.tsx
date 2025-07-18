
import React, { useEffect, useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { currentTenant, isLoading, error } = useTenant();
  const [showMinimumTime, setShowMinimumTime] = useState(true);

  // Ensure splash screen shows for at least 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMinimumTime(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Complete splash screen when tenant is loaded and minimum time has passed
  useEffect(() => {
    if (!isLoading && !showMinimumTime && (currentTenant || error)) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 500);

      return () => clearTimeout(completeTimer);
    }
  }, [isLoading, showMinimumTime, currentTenant, error, onComplete]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tenant Detection Failed
          </h1>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const logoUrl = currentTenant?.branding?.logo_url;
  const companyName = currentTenant?.branding?.company_name || currentTenant?.name;
  const tagline = currentTenant?.branding?.tagline;
  const primaryColor = currentTenant?.branding?.primary_color;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center"
      style={{
        background: primaryColor 
          ? `linear-gradient(135deg, ${primaryColor}10, ${primaryColor}20)`
          : undefined
      }}
    >
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName || 'Loading...'}
              className="w-24 h-24 mx-auto object-contain"
              onError={(e) => {
                // Hide broken image
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto">
              {companyName ? (
                <span className="text-white font-bold text-2xl">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Company Name */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {companyName || 'Loading...'}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p className="text-gray-600 mb-8">
            {tagline}
          </p>
        )}

        {/* Loading Indicator */}
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-gray-600">
            {isLoading ? 'Initializing...' : 'Starting application...'}
          </span>
        </div>

        {/* Loading Progress */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300 ease-out"
              style={{
                width: isLoading ? '60%' : '100%',
                backgroundColor: primaryColor || undefined
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
