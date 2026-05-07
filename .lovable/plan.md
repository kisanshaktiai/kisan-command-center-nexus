## Goal
Fix the Super Admin sidebar so the long menu list is scrollable, and reorganize the recently added items into a clean dedicated group.

## Changes (single file: `src/components/super-admin/SuperAdminSidebar.tsx`)

### 1. Reorganize navigation groups
Split the bloated "Platform Management" group. New structure:

- **Platform Management**: Overview, Tenant Management, Lead Management, Tenant Onboarding, Admin Users, Platform Monitoring, AI Costs
- **Governance & Operations** (new): Backups, Governance Reports, Rules Console, Hypothesis Console, Observation Console, Safety & Regulatory, Simulation Sandbox, Approval Queue, AI Rule Builder, Narration Validation, Hardening & Cron
- **Master Data**: unchanged
- **Billing & Revenue**: unchanged
- **Configuration**: unchanged

### 2. Fix scroll behavior
The outer sidebar container is missing `flex flex-col`, so the inner `ScrollArea` has no bounded height and the list overflows the viewport instead of scrolling.

- Add `flex flex-col` to the root sidebar `div` (line 188).
- Make header and footer `flex-shrink-0`.
- Keep middle nav as `flex-1 min-h-0` so `ScrollArea` gets a real height.

### 3. Auto-collapse other groups (accordion behavior)
Change `toggleGroup` so opening a group closes the others — keeps the visible list short. Default open group becomes whichever contains the active route (fallback: Platform Management).

### 4. Collapsed (icon-only) mode
Keep current behavior: items render as icons with tooltips inside the same ScrollArea, which will now scroll properly too.

## Out of scope
No route, page, or business-logic changes — pure sidebar UI fix.