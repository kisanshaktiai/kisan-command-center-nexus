# App Version Management System

A complete version tracking and update notification system that integrates with your CI/CD pipeline.

## Features

- **Version API**: Read-only edge function returning current app version with caching
- **Update Detection**: Automatic detection of available updates with semver comparison
- **Forced Updates**: Block the app when version is below minimum supported
- **Soft Updates**: Non-intrusive banner for optional updates
- **Health Route**: Debug endpoint at `/health/version`

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub        │────▶│   app_versions   │◀────│   Frontend      │
│   Actions       │     │   (Supabase)     │     │   App           │
│   (CI/CD)       │     └──────────────────┘     └─────────────────┘
└─────────────────┘              ▲                       │
        │                        │                       ▼
        │                  ┌─────┴─────┐          ┌─────────────┐
        └──────────────────│ Edge Fn   │◀─────────│ useApp      │
          Writes version   │ app-ver   │  GET     │ VersionChk  │
                           └───────────┘          └─────────────┘
```

## API Reference

### GET /functions/v1/app-version

Query the current active version for an app.

**Request:**
```bash
curl "https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/app-version?app_key=USER_APP"
```

**Response:**
```json
{
  "app_key": "USER_APP",
  "version": "1.4.2",
  "build_hash": "a9f3c12",
  "deployed_at": "2025-12-23T10:20:30Z",
  "update_policy": "OPTIONAL",
  "min_supported_version": "1.3.0",
  "release_notes": "Bug fixes and performance improvements"
}
```

**Caching:**
- `Cache-Control: public, max-age=300` (5 minutes)
- ETag support for conditional requests

## Frontend Usage

### useAppVersionCheck Hook

```tsx
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';

function MyComponent() {
  const { 
    status,           // 'up-to-date' | 'update-available' | 'update-required' | 'error'
    currentVersion,   // Current app version (e.g., "1.4.2")
    latestVersion,    // Latest version from API
    buildHash,        // Current build hash
    updatePolicy,     // 'OPTIONAL' | 'RECOMMENDED' | 'FORCED'
    isLoading,
    checkForUpdates,  // Manual refresh function
  } = useAppVersionCheck();

  // Handle different states
  if (status === 'update-required') {
    return <ForceUpdateScreen />;
  }
  
  return <YourApp />;
}
```

### UpdateBanner Component

The `UpdateBanner` component is already integrated in `App.tsx` and will automatically:
- Show a dismissible banner for optional updates
- Show a blocking modal for forced updates

## Database Schema

The `app_versions` table stores deployment information:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `app_key` | TEXT | App identifier (e.g., "USER_APP") |
| `version` | TEXT | Semantic version (e.g., "1.4.2") |
| `build_hash` | TEXT | Git commit hash or build identifier |
| `is_current` | BOOLEAN | Whether this is the active version |
| `deployed_at` | TIMESTAMP | When this version was deployed |
| `update_policy` | TEXT | "OPTIONAL", "RECOMMENDED", or "FORCED" |
| `min_supported_version` | TEXT | Minimum version required to use the app |
| `release_notes` | TEXT | User-facing release notes |
| `force_update` | BOOLEAN | Legacy flag (use update_policy instead) |

## CI/CD Integration

Your GitHub Actions workflow should:

1. Build the app and generate a version/hash
2. Insert a record into `app_versions` with `is_current = false`
3. After successful deployment, set `is_current = true` and mark previous versions as `is_current = false`

Example workflow step:
```yaml
- name: Register Version
  run: |
    curl -X POST "$SUPABASE_URL/rest/v1/app_versions" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "app_key": "USER_APP",
        "version": "${{ github.event.release.tag_name }}",
        "build_hash": "${{ github.sha }}",
        "is_current": true,
        "update_policy": "OPTIONAL"
      }'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_VERSION` | App version (from package.json) | "0.0.1" |
| `VITE_BUILD_HASH` | Unique build identifier | Generated |
| `VITE_APP_KEY` | App identifier for API | "USER_APP" |

## Debug Route

Visit `/health/version` to see:
- Current running version and build hash
- Update status and latest version
- Raw debug information
- Manual refresh button

## Update Policies

- **OPTIONAL**: User can dismiss the update banner
- **RECOMMENDED**: More prominent notification, but dismissible
- **FORCED**: Blocks the app until user updates

The `min_supported_version` takes precedence - if current version is below this, the app will be blocked regardless of `update_policy`.
