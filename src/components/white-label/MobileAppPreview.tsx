import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Home, 
  Search, 
  User, 
  Settings, 
  ChevronRight, 
  Bell,
  Menu,
  BarChart3,
  Package,
  TrendingUp,
  ShoppingBag,
  Calendar,
  MapPin,
  Clock,
  Star,
  Heart
} from 'lucide-react';

interface MobileAppPreviewProps {
  theme: any;
  deviceType?: 'iphone' | 'android';
  appName?: string;
  logoUrl?: string;
}

export const MobileAppPreview: React.FC<MobileAppPreviewProps> = ({
  theme,
  deviceType = 'iphone',
  appName = 'Your App',
  logoUrl
}) => {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard' | 'list' | 'profile'>('dashboard');

  // Apply theme colors to CSS variables - support both old and new structure
  const themeStyles = {
    '--theme-primary': theme?.colors?.primary || theme?.core?.primary || '221 83% 53%',
    '--theme-primary-foreground': theme?.colors?.primary_foreground || theme?.core?.primary_foreground || '210 40% 98%',
    '--theme-secondary': theme?.colors?.secondary || theme?.core?.secondary || '210 40% 96%',
    '--theme-secondary-foreground': theme?.colors?.secondary_foreground || theme?.core?.secondary_foreground || '222 47% 11%',
    '--theme-accent': theme?.colors?.accent || theme?.core?.accent || '210 40% 96%',
    '--theme-accent-foreground': theme?.colors?.accent_foreground || theme?.core?.accent_foreground || '222 47% 11%',
    '--theme-background': theme?.colors?.background || theme?.core?.background || '0 0% 100%',
    '--theme-foreground': theme?.colors?.foreground || theme?.core?.foreground || '222 47% 11%',
    '--theme-muted': theme?.colors?.muted || theme?.neutral?.muted || '210 40% 96%',
    '--theme-muted-foreground': theme?.colors?.muted_foreground || theme?.neutral?.muted_foreground || '215 16% 47%',
    '--theme-card': theme?.colors?.card || theme?.neutral?.card || '0 0% 100%',
    '--theme-card-foreground': theme?.colors?.card_foreground || theme?.neutral?.card_foreground || '222 47% 11%',
    '--theme-border': theme?.colors?.border || theme?.neutral?.border || '214 32% 91%',
    '--theme-success': theme?.colors?.success || theme?.status?.success || '142 71% 45%',
    '--theme-warning': theme?.colors?.warning || theme?.status?.warning || '48 96% 53%',
    '--theme-error': theme?.colors?.error || theme?.status?.error || '0 84% 60%',
    '--theme-info': theme?.colors?.info || theme?.status?.info || '199 89% 48%',
  } as React.CSSProperties;

  const deviceFrame = deviceType === 'iphone' ? 'rounded-[3rem]' : 'rounded-[2rem]';
  const notchClass = deviceType === 'iphone' ? 'iphone-notch' : '';

  const renderLoginScreen = () => (
    <div className="h-full flex flex-col items-center justify-center px-8 py-12" 
         style={{ backgroundColor: `hsl(var(--theme-background))` }}>
      {/* Logo */}
      <div className="mb-8">
        {logoUrl ? (
          <img src={logoUrl} alt={appName} className="w-20 h-20 rounded-2xl" />
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
               style={{ backgroundColor: `hsl(var(--theme-primary))` }}>
            <span className="text-3xl font-bold" style={{ color: `hsl(var(--theme-primary-foreground))` }}>
              {appName[0]}
            </span>
          </div>
        )}
      </div>
      
      <h1 className="text-2xl font-bold mb-2" style={{ color: `hsl(var(--theme-foreground))` }}>
        Welcome Back
      </h1>
      <p className="text-sm mb-8" style={{ color: `hsl(var(--theme-muted-foreground))` }}>
        Sign in to continue
      </p>

      {/* Form */}
      <div className="w-full space-y-4">
        <Input 
          placeholder="Email" 
          className="h-12"
          style={{ 
            backgroundColor: `hsl(var(--theme-card))`,
            borderColor: `hsl(var(--theme-border))`,
            color: `hsl(var(--theme-foreground))`
          }}
        />
        <Input 
          type="password" 
          placeholder="Password" 
          className="h-12"
          style={{ 
            backgroundColor: `hsl(var(--theme-card))`,
            borderColor: `hsl(var(--theme-border))`,
            color: `hsl(var(--theme-foreground))`
          }}
        />
        <Button 
          className="w-full h-12 font-semibold"
          style={{ 
            backgroundColor: `hsl(var(--theme-primary))`,
            color: `hsl(var(--theme-primary-foreground))`
          }}
        >
          Sign In
        </Button>
      </div>

      <p className="text-sm mt-6" style={{ color: `hsl(var(--theme-muted-foreground))` }}>
        Don't have an account? 
        <span className="ml-1 font-semibold" style={{ color: `hsl(var(--theme-primary))` }}>
          Sign Up
        </span>
      </p>
    </div>
  );

  const renderDashboardScreen = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: `hsl(var(--theme-background))` }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
           style={{ backgroundColor: `hsl(var(--theme-card))`, borderBottom: `1px solid hsl(var(--theme-border))` }}>
        <Menu size={24} style={{ color: `hsl(var(--theme-foreground))` }} />
        <span className="font-semibold" style={{ color: `hsl(var(--theme-foreground))` }}>{appName}</span>
        <Bell size={24} style={{ color: `hsl(var(--theme-foreground))` }} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border" style={{ backgroundColor: `hsl(var(--theme-card))`, borderColor: `hsl(var(--theme-border))` }}>
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={16} style={{ color: `hsl(var(--theme-success))` }} />
              <span className="text-xs" style={{ color: `hsl(var(--theme-success))` }}>+12%</span>
            </div>
            <p className="text-lg font-bold" style={{ color: `hsl(var(--theme-foreground))` }}>₹45,231</p>
            <p className="text-xs" style={{ color: `hsl(var(--theme-muted-foreground))` }}>Total Revenue</p>
          </div>
          
          <div className="p-3 rounded-lg border" style={{ backgroundColor: `hsl(var(--theme-card))`, borderColor: `hsl(var(--theme-border))` }}>
            <div className="flex items-center justify-between mb-2">
              <Package size={16} style={{ color: `hsl(var(--theme-primary))` }} />
              <span className="text-xs" style={{ color: `hsl(var(--theme-primary))` }}>+8%</span>
            </div>
            <p className="text-lg font-bold" style={{ color: `hsl(var(--theme-foreground))` }}>152</p>
            <p className="text-xs" style={{ color: `hsl(var(--theme-muted-foreground))` }}>Active Orders</p>
          </div>
        </div>

        {/* Chart Card */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: `hsl(var(--theme-card))`, borderColor: `hsl(var(--theme-border))` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: `hsl(var(--theme-foreground))` }}>Weekly Overview</h3>
            <BarChart3 size={18} style={{ color: `hsl(var(--theme-primary))` }} />
          </div>
          <div className="flex items-end justify-between h-24">
            {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
              <div key={i} className="w-8 rounded-t" 
                   style={{ 
                     height: `${height}%`,
                     backgroundColor: i === 6 ? `hsl(var(--theme-primary))` : `hsl(var(--theme-muted))`
                   }} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: ShoppingBag, label: 'Orders', color: '--theme-primary' },
            { icon: Calendar, label: 'Schedule', color: '--theme-success' },
            { icon: MapPin, label: 'Track', color: '--theme-warning' },
            { icon: Star, label: 'Reviews', color: '--theme-info' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ backgroundColor: `hsl(var(${item.color}) / 0.1)` }}>
                <item.icon size={20} style={{ color: `hsl(var(${item.color}))` }} />
              </div>
              <span className="text-xs" style={{ color: `hsl(var(--theme-muted-foreground))` }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderListScreen = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: `hsl(var(--theme-background))` }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
           style={{ backgroundColor: `hsl(var(--theme-card))`, borderBottom: `1px solid hsl(var(--theme-border))` }}>
        <span className="font-semibold" style={{ color: `hsl(var(--theme-foreground))` }}>Products</span>
        <Search size={20} style={{ color: `hsl(var(--theme-foreground))` }} />
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="px-4 py-3 flex items-center justify-between"
               style={{ borderBottom: `1px solid hsl(var(--theme-border))` }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg"
                   style={{ backgroundColor: `hsl(var(--theme-muted))` }} />
              <div>
                <p className="font-medium" style={{ color: `hsl(var(--theme-foreground))` }}>
                  Product Name {item}
                </p>
                <p className="text-xs" style={{ color: `hsl(var(--theme-muted-foreground))` }}>
                  SKU: PRD00{item} • Stock: {50 - item * 8}
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: `hsl(var(--theme-muted-foreground))` }} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileScreen = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: `hsl(var(--theme-background))` }}>
      {/* Header */}
      <div className="px-4 py-6" style={{ backgroundColor: `hsl(var(--theme-primary))` }}>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback style={{ backgroundColor: `hsl(var(--theme-primary-foreground) / 0.2)` }}>JD</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: `hsl(var(--theme-primary-foreground))` }}>
              John Doe
            </h2>
            <p className="text-sm opacity-90" style={{ color: `hsl(var(--theme-primary-foreground))` }}>
              john.doe@example.com
            </p>
          </div>
        </div>
      </div>

      {/* Profile Options */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {[
          { icon: User, label: 'Edit Profile' },
          { icon: Bell, label: 'Notifications' },
          { icon: Heart, label: 'Favorites' },
          { icon: Clock, label: 'Order History' },
          { icon: Settings, label: 'Settings' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg"
               style={{ backgroundColor: `hsl(var(--theme-card))` }}>
            <div className="flex items-center gap-3">
              <item.icon size={20} style={{ color: `hsl(var(--theme-primary))` }} />
              <span style={{ color: `hsl(var(--theme-foreground))` }}>{item.label}</span>
            </div>
            <ChevronRight size={20} style={{ color: `hsl(var(--theme-muted-foreground))` }} />
          </div>
        ))}
      </div>
    </div>
  );

  const screens = {
    login: renderLoginScreen,
    dashboard: renderDashboardScreen,
    list: renderListScreen,
    profile: renderProfileScreen,
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Device Frame */}
      <div className="relative">
        <div 
          className={`relative w-[375px] h-[812px] bg-black ${deviceFrame} overflow-hidden shadow-2xl`}
          style={themeStyles}
        >
          {/* Phone Bezel */}
          <div className="absolute inset-0 bg-black rounded-[inherit] p-2">
            {/* Screen */}
            <div className={`relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden ${notchClass}`}>
              {/* Status Bar */}
              <div className="absolute top-0 left-0 right-0 h-11 px-8 flex items-center justify-between z-10"
                   style={{ backgroundColor: `hsl(var(--theme-background))` }}>
                <span className="text-xs font-medium" style={{ color: `hsl(var(--theme-foreground))` }}>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--theme-foreground))` }} />
                  <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--theme-foreground))` }} />
                  <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--theme-foreground))` }} />
                </div>
              </div>

              {/* App Content */}
              <div className="pt-11 h-full relative">
                {screens[currentScreen]()}
                
                {/* Bottom Navigation */}
                {currentScreen !== 'login' && (
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-2"
                       style={{ backgroundColor: `hsl(var(--theme-card))`, borderTop: `1px solid hsl(var(--theme-border))` }}>
                    <div className="flex items-center justify-around">
                      {[
                        { icon: Home, screen: 'dashboard' as const },
                        { icon: Search, screen: 'list' as const },
                        { icon: ShoppingBag, screen: 'dashboard' as const },
                        { icon: User, screen: 'profile' as const },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentScreen(item.screen)}
                          className="p-2"
                        >
                          <item.icon 
                            size={24} 
                            style={{ 
                              color: currentScreen === item.screen 
                                ? `hsl(var(--theme-primary))` 
                                : `hsl(var(--theme-muted-foreground))`
                            }} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* iPhone Notch */}
          {deviceType === 'iphone' && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-20" />
          )}
        </div>
      </div>

      {/* Screen Selector */}
      <div className="flex gap-2">
        {Object.keys(screens).map((screen) => (
          <Button
            key={screen}
            variant={currentScreen === screen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentScreen(screen as keyof typeof screens)}
            className="capitalize"
          >
            {screen}
          </Button>
        ))}
      </div>
    </div>
  );
};