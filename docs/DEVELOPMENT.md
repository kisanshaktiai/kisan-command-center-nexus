
# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase CLI (optional, for local development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <project-name>

# Install dependencies
npm install

# Set up pre-commit hooks
npm run prepare

# Start development server
npm run dev
```

### Environment Setup

The application uses Supabase secrets management. No local `.env` files are required for basic functionality.

For development with local Supabase:
```bash
# Start local Supabase
supabase start

# Update src/config/environment.ts with local URLs
```

## Development Workflow

### Code Quality

```bash
# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npm run type-check
```

### Testing

```bash
# Unit tests
npm run test
npm run test:ui
npm run test:coverage

# E2E tests
npm run test:e2e
npm run test:e2e:ui
```

### Git Workflow

1. Create feature branch from `main`
2. Make changes with frequent commits
3. Run tests and quality checks
4. Create pull request
5. Code review and merge

Pre-commit hooks will automatically:
- Run ESLint and fix issues
- Format code with Prettier
- Validate commit message format

## Project Structure

### Component Organization

```
src/components/
├── ui/              # Base UI components (buttons, inputs, etc.)
├── auth/            # Authentication-related components
├── leads/           # Lead management components
├── super-admin/     # Admin interface components
└── providers/       # Context providers and wrappers
```

### Service Layer

```
src/services/
├── BaseService.ts       # Base service with common functionality
├── LeadService.ts      # Lead-related operations
├── TenantService.ts    # Tenant management
└── AuthService.ts      # Authentication services
```

### Custom Hooks

```
src/hooks/
├── useAuth.ts          # Authentication state
├── useLeadManagement.ts # Lead operations
├── useTenantManagement.ts # Tenant operations
└── usePermissions.ts    # Role-based permissions
```

## Multi-Tenancy Implementation

### Database Design

Every tenant-related table should include:
- `tenant_id` column with proper foreign key
- RLS policies for tenant isolation
- Indexes on frequently queried tenant data

### Frontend Tenant Context

```typescript
// Always include tenant context in data fetching
const { data: leads } = useQuery({
  queryKey: ['leads', tenantId],
  queryFn: () => LeadService.getLeads(tenantId),
  enabled: !!tenantId,
});
```

### Security Checklist

- [ ] All tables have RLS enabled
- [ ] All queries filter by tenant_id
- [ ] User permissions are validated
- [ ] Sensitive operations require re-authentication
- [ ] Input validation is implemented
- [ ] XSS prevention measures in place

## Testing Guidelines

### Unit Testing

```typescript
// Test services with mocked dependencies
describe('LeadService', () => {
  it('should fetch leads for tenant', async () => {
    // Mock implementation
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockLeads,
        error: null,
      }),
    });

    const result = await LeadService.getLeads('tenant-id');
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

```typescript
// Test hooks with React Query wrapper
const wrapper = ({ children }) => (
  <QueryClientProvider client={testQueryClient}>
    {children}
  </QueryClientProvider>
);

const { result } = renderHook(() => useLeads(), { wrapper });
```

### E2E Testing

```typescript
// Test complete user journeys
test('should complete lead conversion flow', async ({ page }) => {
  await page.goto('/super-admin/lead-management');
  await page.click('[data-testid="convert-lead-button"]');
  // ... test steps
});
```

## Performance Best Practices

### React Optimization
- Use `React.memo` for expensive components
- Implement proper key props for lists
- Avoid unnecessary re-renders with `useCallback` and `useMemo`
- Code split heavy features with `React.lazy`

### Database Optimization
- Use proper indexes on frequently queried columns
- Implement pagination for large datasets
- Use `select` to limit returned columns
- Batch multiple operations when possible

### Bundle Optimization
- Analyze bundle size with `npm run build`
- Lazy load heavy dependencies
- Use dynamic imports for code splitting
- Optimize images and assets

## Debugging

### Frontend Debugging
- Use React DevTools for component inspection
- TanStack Query DevTools for cache inspection
- Browser DevTools for network and performance

### Backend Debugging
- Check Supabase logs in dashboard
- Use edge function logs for serverless debugging
- Monitor database performance metrics

### Common Issues

1. **RLS Policy Issues**
   - Check if user has proper tenant access
   - Verify policy conditions
   - Test with different user roles

2. **Authentication Issues**
   - Check token expiration
   - Verify user session state
   - Check for proper redirects

3. **Performance Issues**
   - Check for unnecessary re-renders
   - Monitor API call frequency
   - Analyze bundle size

## Deployment

### Staging Deployment
```bash
# Run all tests
npm run test
npm run test:e2e

# Build application
npm run build

# Deploy to staging
# (Deployment process varies by platform)
```

### Production Deployment
- Ensure all tests pass
- Verify environment configuration
- Run security audit
- Monitor deployment health

## Contributing

### Code Style
- Follow existing TypeScript patterns
- Use functional components with hooks
- Implement proper error boundaries
- Add JSDoc comments for complex functions

### Pull Request Process
1. Create descriptive branch name
2. Write clear commit messages
3. Add tests for new functionality
4. Update documentation if needed
5. Ensure CI passes
6. Request code review

### Review Checklist
- [ ] Code follows established patterns
- [ ] Tests are comprehensive
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Documentation updated
- [ ] Breaking changes documented
