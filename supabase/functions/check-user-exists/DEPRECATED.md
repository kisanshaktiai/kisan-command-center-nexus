# ⚠️ DEPRECATED FUNCTION

This function has been consolidated into the unified `user-management` function.

## Migration

**Old:**
```typescript
await supabase.functions.invoke('check-user-exists', {
  body: { email: 'user@example.com' }
});
```

**New:**
```typescript
await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'check-exists',
    email: 'user@example.com' 
  }
});
```

## Removal Date
This function will be removed on: **2025-12-20** (30 days from consolidation)

## See Also
- [Consolidation Documentation](../../../EDGE_FUNCTIONS_CONSOLIDATION.md)
- [user-management Function](../user-management/index.ts)
