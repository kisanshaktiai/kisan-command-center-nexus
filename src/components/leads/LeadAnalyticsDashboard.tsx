
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award,
  BarChart3,
  PieChart,
  Calendar
} from 'lucide-react';
import {
  useConversionFunnel,
  useLeadPerformance,
  useSourceEffectiveness,
  useTeamPerformance,
} from '@/hooks/useLeadAnalytics';

interface LeadAnalyticsDashboardProps {
  open: boolean;
  onClose: () => void;
}

export const LeadAnalyticsDashboard: React.FC<LeadAnalyticsDashboardProps> = ({
  open,
  onClose,
}) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { data: funnelData, isLoading: funnelLoading } = useConversionFunnel(dateRange);
  const { data: performanceData, isLoading: performanceLoading } = useLeadPerformance(dateRange);
  const { data: sourceData, isLoading: sourceLoading } = useSourceEffectiveness(dateRange);
  const { data: teamData, isLoading: teamLoading } = useTeamPerformance(dateRange);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lead Analytics Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="funnel" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sources">Lead Sources</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {funnelLoading ? (
                  <div className="animate-pulse space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {funnelData && Object.entries(funnelData.funnel).map(([stage, count]) => {
                      const percentage = funnelData.total > 0 ? ((count as number) / funnelData.total) * 100 : 0;
                      return (
                        <div key={stage} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-20 justify-center">
                              {stage.charAt(0).toUpperCase() + stage.slice(1)}
                            </Badge>
                            <span className="font-medium">{count as number} leads</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-12">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Leads</p>
                      <p className="text-2xl font-bold">
                        {performanceLoading ? '...' : performanceData?.totalLeads || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Score</p>
                      <p className="text-2xl font-bold">
                        {performanceLoading ? '...' : (performanceData?.avgScore || 0).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Time to Contact</p>
                      <p className="text-2xl font-bold">
                        {performanceLoading ? '...' : (performanceData?.avgTimeToContact || 0).toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Time to Conversion</p>
                      <p className="text-2xl font-bold">
                        {performanceLoading ? '...' : (performanceData?.avgTimeToConversion || 0).toFixed(1)}d
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Leads */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="animate-pulse space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {performanceData?.topPerformers?.map((lead, index) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-gray-600">{lead.organization}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{lead.status}</Badge>
                          <span className="font-medium">{lead.score}</span>
                        </div>
                      </div>
                    )) || <p className="text-gray-500">No leads available</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Lead Source Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourceLoading ? (
                  <div className="animate-pulse space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sourceData && Object.entries(sourceData).map(([source, stats]: [string, any]) => (
                      <div key={source} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-24 justify-center">
                            {source.charAt(0).toUpperCase() + source.slice(1)}
                          </Badge>
                          <div>
                            <p className="font-medium">{stats.total} leads</p>
                            <p className="text-sm text-gray-600">
                              {stats.converted} converted ({stats.conversionRate?.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Score: {stats.avgScore?.toFixed(1)}</p>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(stats.conversionRate || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <div className="animate-pulse space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamData && Object.entries(teamData).map(([adminId, stats]: [string, any]) => (
                      <div key={adminId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {stats.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-medium">{stats.name || 'Unknown Admin'}</p>
                            <p className="text-sm text-gray-600">
                              {stats.totalLeads} leads • {stats.converted} converted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {stats.conversionRate?.toFixed(1) || 0}% conversion
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg Score: {stats.avgScore?.toFixed(1) || 0}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
