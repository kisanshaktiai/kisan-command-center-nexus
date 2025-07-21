
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BrandingPreviewProps {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  appName?: string;
  appTagline?: string;
}

export const BrandingPreview: React.FC<BrandingPreviewProps> = ({
  logoUrl,
  primaryColor = '#10B981',
  secondaryColor = '#065F46',
  appName = 'KisanShakti AI',
  appTagline = 'Empowering Farmers with AI Technology'
}) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Brand Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mobile App Preview */}
        <div 
          className="rounded-lg p-4 text-white relative overflow-hidden"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: secondaryColor }}
              >
                {appName.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-sm">{appName}</h3>
              <p className="text-xs opacity-90">{appTagline}</p>
            </div>
          </div>
          
          {/* Mock UI Elements */}
          <div className="mt-4 space-y-2">
            <div className="flex space-x-2">
              <Badge variant="secondary" className="text-xs">Weather</Badge>
              <Badge variant="secondary" className="text-xs">Crops</Badge>
              <Badge variant="secondary" className="text-xs">Market</Badge>
            </div>
            <div 
              className="rounded p-2 text-xs"
              style={{ backgroundColor: secondaryColor }}
            >
              Welcome to your farming dashboard
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium">Color Palette</h4>
          <div className="flex space-x-2">
            <div className="flex flex-col items-center">
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xs mt-1">Primary</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-xs mt-1">Secondary</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
