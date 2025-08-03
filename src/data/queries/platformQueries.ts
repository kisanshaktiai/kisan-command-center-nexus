
export const platformQueries = {
  all: ['platform'] as const,
  overview: () => [...platformQueries.all, 'overview'] as const,
  metrics: () => [...platformQueries.all, 'metrics'] as const,
  systemHealth: () => [...platformQueries.metrics(), 'system-health'] as const,
  resources: () => [...platformQueries.metrics(), 'resources'] as const,
  financials: (dateRange?: { from: Date; to: Date }) => 
    [...platformQueries.metrics(), 'financials', dateRange] as const,
  sessions: () => [...platformQueries.all, 'sessions'] as const,
  activeSessions: () => [...platformQueries.sessions(), 'active'] as const,
  notifications: () => [...platformQueries.all, 'notifications'] as const,
  unreadNotifications: () => [...platformQueries.notifications(), 'unread'] as const,
};
