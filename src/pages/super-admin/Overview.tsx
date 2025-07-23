
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

export default function Overview() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Platform Overview"
        description="Monitor platform performance and key metrics"
        badge={{ text: "Live", variant: "default" }}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-4 max-w-7xl">
          {/* Key Metrics Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Active Tenants"
              value="24"
              icon={Building2}
              trend={{
                value: "+12%",
                label: "vs last month",
                type: "positive"
              }}
            />
            <StatsCard
              title="Total Users"
              value="1,247"
              icon={Users}
              trend={{
                value: "+8%",
                label: "vs last month",
                type: "positive"
              }}
            />
            <StatsCard
              title="Monthly Revenue"
              value="$12,450"
              icon={DollarSign}
              trend={{
                value: "+15%",
                label: "vs last month",
                type: "positive"
              }}
            />
            <StatsCard
              title="System Health"
              value="99.9%"
              icon={Activity}
              trend={{
                value: "0.1%",
                label: "downtime",
                type: "neutral"
              }}
            />
          </div>

          {/* Recent Activity and Alerts */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">New</Badge>
                    <span className="text-sm">Tenant "AgriCorp" registered</span>
                  </div>
                  <span className="text-xs text-muted-foreground">2 min ago</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Update</Badge>
                    <span className="text-sm">System maintenance completed</span>
                  </div>
                  <span className="text-xs text-muted-foreground">15 min ago</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">Payment</Badge>
                    <span className="text-sm">Monthly billing processed</span>
                  </div>
                  <span className="text-xs text-muted-foreground">1 hour ago</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">All systems operational</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">OK</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">CPU usage normal</span>
                  </div>
                  <Badge variant="outline" className="text-xs">45%</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Database healthy</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">OK</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Status */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Platform Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Response Time</span>
                    <span className="text-sm font-medium">145ms</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Memory Usage</span>
                    <span className="text-sm font-medium">62%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Storage Usage</span>
                    <span className="text-sm font-medium">38%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '38%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
