
import { useDashboardMetrics } from './useDashboardMetrics';
import { useDashboardRealtime } from './useDashboardRealtime';

export const useOptimizedAdminDashboard = () => {
  const { 
    data: metricsData, 
    isLoading: metricsLoading, 
    error: metricsError, 
    refetch: refetchMetrics 
  } = useDashboardMetrics();

  const { 
    realtimeData, 
    hasRealtimeUpdates 
  } = useDashboardRealtime();

  // Merge static and real-time data
  const mergedData = metricsData ? {
    ...metricsData,
    systemHealth: 95, // Mock data
    storageUsed: Math.floor(45 + Math.random() * 10),
    activeSessions: realtimeData.activeSessions,
    unreadNotifications: realtimeData.unreadNotifications,
    recentApiLogs: realtimeData.recentApiLogs,
  } : null;

  return {
    data: mergedData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
    hasRealtimeUpdates
  };
};
