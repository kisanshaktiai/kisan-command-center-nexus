
# Naming Conventions

## Service Naming
- **Pattern**: `StandardizedXxxService`
- **Examples**: 
  - `StandardizedTenantService`
  - `StandardizedUserService` 
  - `StandardizedAuthService`

## Hook Naming
- **Pattern**: `useStandardizedXxx` for main hooks
- **Pattern**: `useXxxYyy` for focused hooks
- **Examples**:
  - `useStandardizedTenantManagement` (main composite hook)
  - `useTenantDataLayer` (focused data hook)
  - `useTenantActions` (focused actions hook)

## Repository Naming
- **Pattern**: `XxxRepository` 
- **Examples**: `TenantRepository`, `UserRepository`

## Context Naming
- **Pattern**: `UnifiedXxxProvider`
- **Examples**: `UnifiedTenantProvider`, `UnifiedAuthProvider`

## Testing Utilities
- **Pattern**: `createMockXxx` for factories
- **Pattern**: `createTestXxx` for test utilities
- **Examples**: `createMockTenant`, `createTestQueryClient`

## File Organization
```
src/
├── hooks/
│   ├── domain/           # Business logic hooks
│   ├── ui/              # Pure UI state hooks  
│   └── {feature}/       # Feature-specific hooks
├── services/
│   ├── core/            # Core standardized services
│   ├── validation/      # Validation services
│   └── {feature}/       # Feature-specific services
├── contexts/            # React contexts
├── __tests__/
│   └── utils/           # Testing utilities
└── docs/                # Documentation
```

## Consistency Rules
1. **No duplicate hook names** across different directories
2. **Services must be injectable** for testing
3. **Hooks should be composable** and single-purpose
4. **All exports** must be explicit (no default exports for hooks/services)
5. **Mock factories** must match real data structures
