
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Lock } from 'lucide-react';
import { useMultiTenant } from '@/hooks/useMultiTenant';

interface FeatureConfig {
  key: string;
  name: string;
  description: string;
  category: 'Core' | 'Analytics' | 'Integration' | 'Advanced';
  isPremium: boolean;
}

const AVAILABLE_FEATURES: FeatureConfig[] = [
  { key: 'ai_chat', name: 'AI Chat Assistant', description: 'AI-powered chat support for farmers', category: 'Core', isPremium: false },
  { key: 'weather_forecast', name: 'Weather Forecasting', description: 'Real-time weather data and forecasts', category: 'Core', isPremium: false },
  { key: 'marketplace', name: 'Marketplace', description: 'Buy and sell agricultural products', category: 'Core', isPremium: false },
  { key: 'satellite_imagery', name: 'Satellite Imagery', description: 'Satellite-based crop monitoring', category: 'Advanced', isPremium: true },
  { key: 'soil_testing', name: 'Soil Testing', description: 'Digital soil analysis and recommendations', category: 'Advanced', isPremium: false },
  { key: 'drone_monitoring', name: 'Drone Monitoring', description: 'Drone-based field surveillance', category: 'Advanced', isPremium: true },
  { key: 'iot_integration', name: 'IoT Integration', description: 'Connect IoT sensors and devices', category: 'Integration', isPremium: true },
  { key: 'payment_gateway', name: 'Payment Gateway', description: 'Integrated payment processing', category: 'Core', isPremium: false },
  { key: 'basic_analytics', name: 'Basic Analytics', description: 'Essential farming analytics and reports', category: 'Analytics', isPremium: false },
  { key: 'advanced_analytics', name: 'Advanced Analytics', description: 'Detailed insights and predictions', category: 'Analytics', isPremium: true },
  { key: 'predictive_analytics', name: 'Predictive Analytics', description: 'AI-powered crop yield predictions', category: 'Analytics', isPremium: true },
  { key: 'api_access', name: 'API Access', description: 'RESTful API for third-party integrations', category: 'Integration', isPremium: true },
  { key: 'white_label_mobile_app', name: 'White-label Mobile App', description: 'Branded mobile application', category: 'Advanced', isPremium: true },
];

export function FeatureToggle() {
  const { tenant, isFeatureEnabled } = useMultiTenant();

  if (!tenant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Feature Management
          </CardTitle>
          <CardDescription>
            No tenant context available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getCategoryColor = (category: FeatureConfig['category']) => {
    switch (category) {
      case 'Core': return 'bg-blue-100 text-blue-800';
      case 'Analytics': return 'bg-green-100 text-green-800';
      case 'Integration': return 'bg-purple-100 text-purple-800';
      case 'Advanced': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedFeatures = AVAILABLE_FEATURES.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureConfig[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Feature Management
        </CardTitle>
        <CardDescription>
          Configure available features for {tenant.branding.app_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, features]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{category} Features</h4>
              <Badge className={getCategoryColor(category as FeatureConfig['category'])}>
                {features.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {features.map((feature) => {
                const enabled = isFeatureEnabled(feature.key);
                
                return (
                  <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feature.name}</span>
                        {feature.isPremium && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={true} // Read-only for now
                      className="ml-4"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            Feature toggles are currently read-only and configured based on your subscription plan. 
            Contact support to modify your feature set.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
