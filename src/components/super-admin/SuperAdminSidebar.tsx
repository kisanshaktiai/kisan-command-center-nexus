
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Users, 
  UserPlus, 
  CreditCard, 
  DollarSign,
  Flag, 
  Palette, 
  Activity,
  Settings,
  ChevronDown,
  LogOut,
  Shield,
  Briefcase,
  Building,
  Package,
  Layers,
  Satellite,
  Info,
  Brain,
  HardDrive,
  Gavel,
  BookOpen,
  Lightbulb,
  Eye,
  ShieldAlert,
  FlaskConical,
  ClipboardCheck,
  Wand2,
  ScanSearch,
  Wrench,
  FileCode2,
  Library,
  UploadCloud,
  FileStack
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';

const navigationItems = [
  {
    title: 'Platform Management',
    items: [
      { title: 'Overview', tab: 'overview', route: '/super-admin/overview', icon: Home },
      { title: 'Tenant Management', tab: 'tenant-management', route: '/super-admin/tenant-management', icon: Users },
      { title: 'Lead Management', tab: 'lead-management', route: '/super-admin/lead-management', icon: Briefcase },
      { title: 'Tenant Onboarding', tab: 'tenant-onboarding', route: '/super-admin/tenant-onboarding', icon: UserPlus },
      { title: 'Admin Users', tab: 'admin-user-management', route: '/super-admin/admin-user-management', icon: Shield },
      { title: 'Platform Monitoring', tab: 'platform-monitoring', route: '/super-admin/platform-monitoring', icon: Activity },
      { title: 'AI Costs', tab: 'ai-costs', route: '/super-admin/ai-costs', icon: Brain },
    ]
  },
  {
    title: 'AI Knowledge Base',
    items: [
      { title: 'Knowledge Sources', tab: 'knowledge-sources', route: '/super-admin/governance/knowledge?tab=sources', icon: Library },
      { title: 'Upload Document', tab: 'knowledge-upload', route: '/super-admin/governance/knowledge?tab=upload', icon: UploadCloud },
      { title: 'Ingested Documents', tab: 'knowledge-documents', route: '/super-admin/governance/knowledge?tab=documents', icon: FileStack },
    ]
  },
  {
    title: 'Governance & Operations',
    items: [

      { title: 'Backups', tab: 'backups', route: '/super-admin/backups', icon: HardDrive },
      { title: 'Governance Reports', tab: 'governance-reports', route: '/super-admin/governance/reports', icon: Gavel },
      { title: 'Rules Console', tab: 'rules-console', route: '/super-admin/governance/rules', icon: BookOpen },
      { title: 'Hypothesis Console', tab: 'hypothesis-console', route: '/super-admin/governance/hypotheses', icon: Lightbulb },
      { title: 'Observation Console', tab: 'observation-console', route: '/super-admin/governance/observations', icon: Eye },
      { title: 'Safety & Regulatory', tab: 'safety-console', route: '/super-admin/governance/safety', icon: ShieldAlert },
      { title: 'Simulation Sandbox', tab: 'simulation-sandbox', route: '/super-admin/governance/simulate', icon: FlaskConical },
      { title: 'Approval Queue', tab: 'approval-queue', route: '/super-admin/governance/queue', icon: ClipboardCheck },
      { title: 'AI Rule Builder', tab: 'ai-rule-builder', route: '/super-admin/governance/rules/new', icon: Wand2 },
      { title: 'AI Prompt Templates', tab: 'ai-prompt-templates', route: '/super-admin/governance/prompts', icon: FileCode2 },
      { title: 'Narration Validation', tab: 'narration-validation', route: '/super-admin/governance/narration', icon: ScanSearch },
      { title: 'Hardening & Cron', tab: 'hardening', route: '/super-admin/governance/hardening', icon: Wrench },
    ]
  },
  {
    title: 'Master Data',
    items: [
      { title: 'Master Companies', tab: 'master-companies', route: '/super-admin/master-companies', icon: Building },
      { title: 'Product Categories', tab: 'product-categories', route: '/super-admin/product-categories', icon: Layers },
      { title: 'Master Products', tab: 'master-products', route: '/super-admin/master-products', icon: Package },
      { title: 'NDVI Data Status', tab: 'ndvi-data-status', route: '/super-admin/ndvi-data-status', icon: Satellite },
    ]
  },
  {
    title: 'Billing & Revenue',
    items: [
      { title: 'Subscription Management', tab: 'subscription-management', route: '/super-admin/subscription-management', icon: DollarSign },
      { title: 'Billing Management', tab: 'billing-management', route: '/super-admin/billing-management', icon: CreditCard },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Feature Flags', tab: 'feature-flags', route: '/super-admin/feature-flags', icon: Flag },
      { title: 'White Label Config', tab: 'white-label-config', route: '/super-admin/white-label-config', icon: Palette },
      { title: 'White Label Data Fix', tab: 'white-label-data-fix', route: '/super-admin/white-label-data-fix', icon: Palette },
    ]
  }
];

interface SuperAdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SuperAdminSidebar({ isOpen, setIsOpen, activeTab, onTabChange }: SuperAdminSidebarProps) {
  const { signOut } = useAuth();
  const appKey = 'admin_portal';
  const { currentVersion, buildHash, isLoading } = useAppVersionCheck(appKey);
  const versionLabel = currentVersion ? `v${currentVersion}` : isLoading ? 'v…' : 'v—';
  const buildLabel = buildHash ? buildHash.slice(0, 7) : isLoading ? '…' : '—';
  const location = useLocation();

  const activeGroup = navigationItems.find(g =>
    g.items.some(i => i.route.split('?')[0] === location.pathname)
  )?.title ?? 'Platform Management';
  const [openGroups, setOpenGroups] = useState<string[]>([activeGroup]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };


  const closeSidebar = () => setIsOpen(false);

  const handleSignOut = async () => {
    await signOut();
    closeSidebar();
  };

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  const NavItem = ({ item }: { item: any }) => {
    const [itemPath, itemSearch] = item.route.split('?');
    const isActive = itemSearch
      ? location.pathname === itemPath &&
        (location.search.replace(/^\?/, '') || 'tab=sources') === itemSearch
      : location.pathname === item.route;
    
    const itemContent = (
      <Link
        to={item.route}
        onClick={() => handleTabClick(item.tab)}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group w-full text-left",
          isOpen ? "px-4 py-3" : "px-3 py-3 justify-center",
          isActive
            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {isOpen && (
          <span className="transition-opacity duration-200">
            {item.title}
          </span>
        )}
        {isActive && isOpen && (
          <div className="w-2 h-2 bg-white rounded-full ml-auto" />
        )}
      </Link>
    );

    if (!isOpen) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {itemContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return itemContent;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl transform transition-all duration-300 ease-in-out",
        isOpen ? "w-72" : "w-16",
        "translate-x-0"
      )}>
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            {isOpen && (
              <div className="transition-opacity duration-200">
                <h2 className="font-bold text-white text-lg">Super Admin</h2>
                <p className="text-xs text-slate-300">Platform Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation with ScrollArea */}
        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className={cn("flex-1 py-2", isOpen ? "px-4" : "px-2")}>
            <div className={cn(isOpen ? "space-y-2" : "space-y-3")}>
              {navigationItems.map((group) => (
                <div key={group.title}>
                  {isOpen ? (
                    <Collapsible
                      open={openGroups.includes(group.title)}
                      onOpenChange={() => toggleGroup(group.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                        >
                          <span className="text-xs font-semibold uppercase tracking-wider">
                            {group.title}
                          </span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            openGroups.includes(group.title) && "transform rotate-180"
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-1 mt-2">
                        {group.items.map((item) => (
                          <NavItem key={item.title} item={item} />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <NavItem key={item.title} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer - Version & Sign Out */}
        <div className="border-t border-slate-700 p-4 space-y-3 flex-shrink-0">
          {/* Version Display */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/health/version"
                  className={cn(
                    "flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg p-2 hover:bg-slate-700/30",
                    !isOpen && "justify-center"
                  )}
                >
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  {isOpen && (
                    <span className="font-mono">
                      {versionLabel} <span className="text-slate-500">({buildLabel})</span>
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <div className="text-xs">
                  <p>Version: {currentVersion || (isLoading ? '…' : '—')}</p>
                  <p className="text-muted-foreground">Build: {buildHash || (isLoading ? '…' : '—')}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Sign Out Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sm text-slate-300 hover:text-white transition-colors duration-200 p-3 rounded-lg hover:bg-slate-700/50",
                    !isOpen && "justify-center px-3"
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  {isOpen && (
                    <span className="transition-opacity duration-200">
                      Sign Out
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              {!isOpen && (
                <TooltipContent side="right" className="ml-2">
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </>
  );
}
