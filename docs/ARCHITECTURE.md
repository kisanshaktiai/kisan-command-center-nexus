
# Architecture Documentation

## Overview

This is a multi-tenant SaaS platform built for agricultural technology companies. The platform provides lead management, tenant onboarding, and administrative capabilities with a focus on scalability and security.

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State Management**: Zustand, TanStack Query
- **Routing**: React Router v6
- **UI Components**: Radix UI, shadcn/ui
- **Testing**: Vitest, Playwright
- **Build Tool**: Vite

## Multi-Tenancy Architecture

### Tenant Isolation

The platform implements row-level security (RLS) at the database level:

```sql
-- Example RLS policy
CREATE POLICY "Users can only access their tenant data" ON leads
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### Data Model

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Tenants   │────│UserTenants  │────│    Users    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                      │
       │           ┌─────────────┐           │
       └───────────│    Leads    │───────────┘
                   └─────────────┘
```

### Key Tables

- `tenants`: Organization/company information
- `user_tenants`: Many-to-many relationship between users and tenants
- `admin_users`: Super admin and platform admin users
- `leads`: Lead management data
- `tenant_subscriptions`: Billing and subscription information

## Authentication & Authorization

### User Types

1. **Super Admin**: Platform-wide administration
2. **Platform Admin**: Limited platform administration
3. **Tenant Admin**: Tenant-specific administration
4. **Regular User**: Basic tenant access

### Role-Based Access Control (RBAC)

```typescript
const ROLE_PERMISSIONS = {
  super_admin: ['manage_users', 'manage_tenants', 'manage_billing'],
  platform_admin: ['manage_users', 'view_analytics'],
  admin: ['manage_leads', 'view_reports'],
  user: ['view_dashboard'],
};
```

## Security Measures

### Database Security
- Row Level Security (RLS) on all tenant-related tables
- Secure functions with `SECURITY DEFINER`
- Input validation and sanitization
- Audit logging for sensitive operations

### Application Security
- JWT token validation
- Session management with timeout
- CSRF protection
- XSS prevention through input sanitization

### Edge Functions Security
- Environment variable management through Supabase secrets
- CORS headers for web app compatibility
- Input validation and error handling

## State Management

### Authentication State
- Managed via Zustand store (`authStore`)
- Includes user session, tenant context, and admin roles

### Data Fetching
- TanStack Query for server state management
- Real-time subscriptions for live data updates
- Optimistic updates for better UX

## File Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── leads/          # Lead management
│   ├── super-admin/    # Admin interface
│   └── ui/             # Base UI components
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
├── config/             # Configuration files
└── __tests__/          # Test files
```

## API Layer

### Service Pattern
```typescript
class LeadService {
  static async getLeads(): Promise<ServiceResult<Lead[]>> {
    // Implementation with error handling
  }
}
```

### Error Handling
- Centralized error handling through `BaseService`
- User-friendly error messages
- Automatic retry logic for transient failures

## Testing Strategy

### Unit Testing
- Service layer testing with mocked dependencies
- Hook testing with React Testing Library
- Component testing for critical business logic

### Integration Testing
- API integration tests
- Database transaction testing
- Authentication flow testing

### End-to-End Testing
- User journey testing with Playwright
- Cross-browser compatibility testing
- Mobile responsiveness testing

## Deployment

### Environment Configuration
- Development: Local Supabase instance
- Staging: Supabase staging project
- Production: Supabase production project

### CI/CD Pipeline
- Automated testing on PR
- Code quality checks (ESLint, Prettier)
- Automated deployment to staging/production

## Performance Considerations

### Frontend Optimization
- Code splitting by route and feature
- Lazy loading of heavy components
- Image optimization and compression
- Bundle size monitoring

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization and monitoring
- Connection pooling
- Caching strategies for read-heavy data

## Monitoring & Analytics

### Error Tracking
- Runtime error monitoring
- Performance monitoring
- User behavior analytics

### Logging
- Structured logging in edge functions
- Audit logs for sensitive operations
- Performance metrics collection

## Future Considerations

### Scalability
- Horizontal scaling strategies
- Database sharding considerations
- CDN implementation for global reach

### Features
- Advanced analytics and reporting
- Mobile app development
- Third-party integrations
- White-label customization
