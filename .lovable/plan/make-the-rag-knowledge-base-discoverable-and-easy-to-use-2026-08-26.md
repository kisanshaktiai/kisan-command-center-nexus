# Make the RAG Knowledge Base discoverable and easy to use

## What I verified first

The feature is not missing — it is buried:

- The route `/super-admin/governance/knowledge` is registered and the page renders three tabs: **Sources**, **Upload**, **Documents**. The upload card (signed-URL upload + ingest) exists and is wired.
- The sidebar link "Knowledge Sources" does exist, but it is the **13th and last item** inside the collapsed "Governance & Operations" group. The sidebar allows only **one group open at a time**, so from Overview the whole group is shut and the link is invisible without scrolling a long accordion.
- The page gates on `isSuperAdmin` (from `admin_users.role = 'super_admin'`); a non-super-admin sees only a small "restricted" alert with no heading, which reads as "no page".
- There is no entry point from Overview, and no way to link straight to the upload step.

So the fix is UI/UX wiring and discoverability, not new backend work.

## What I will change

1. **Own sidebar section for the knowledge base**
   - New group **"AI Knowledge Base"** placed directly after "Platform Management", containing "Knowledge Sources" (Library icon) and a second entry "Upload Document" that deep-links to the upload tab.
   - Sidebar groups become independently expandable (opening one no longer force-closes the others), and the group containing the active route stays open on load.

2. **Deep-linkable tabs on the Knowledge Sources page**
   - Read and write `?tab=sources|upload|documents` in the URL so the sidebar "Upload Document" entry, Overview shortcut, and browser back/forward all land on the right tab.

3. **Obvious upload affordance on the page**
   - Primary header button **"Upload document"** (switches to the Upload tab) next to the existing "New source" button, so uploading is visible without discovering the tab strip.
   - When no source is registered yet, the Upload tab shows a short empty state explaining that a source must be registered first, with a button that opens the New Source dialog.
   - When the corpus is empty, the Documents tab shows an empty state with an "Upload the first document" button.

4. **Entry point from Overview**
   - A compact "Knowledge Base" card in the Overview grid showing document and chunk counts (from the existing retrieval/source data already fetched by the RAG hooks) and linking to the knowledge page.

5. **Honest access state**
   - The restricted view keeps the page title plus a clearer message ("Ask a super admin to grant access"), instead of a bare alert, so the page never looks broken or missing.

## Technical notes

- `src/components/super-admin/SuperAdminSidebar.tsx` — new nav group; `openGroups` becomes additive (toggle in/out instead of replacing the array); active-route group auto-opened.
- `src/pages/super-admin/KnowledgeSources.tsx` — `useSearchParams` for tab state, header "Upload document" button, empty states, improved restricted view.
- `src/pages/super-admin/Overview.tsx` — knowledge-base shortcut card, using existing hooks in `src/hooks/useRagAdmin.ts` (no new queries beyond the sources/documents lists already exposed).
- No database migration, no edge-function change, no change to the upload/ingest contract. All colors via existing semantic tokens.
