# AI Rule Builder v2 — Editable Prompts, Multi-Table, Claude via Gateway

## Goal
Turn the AI Rule Builder from a single hard-coded prompt that drafts only `decision_rules` into a configurable system where super admins can:
1. Manage named prompt templates (CRUD + edit) per governance table.
2. Pick a template, fill variables, and draft a row using Claude via the Lovable AI Gateway.
3. Send the draft to the approval queue (default) or, if the template has `auto_apply` enabled, write directly to the target table.

## Important note on Claude availability
The Lovable AI Gateway catalog currently does **not** list Anthropic/Claude models — only Google Gemini and OpenAI GPT families. We will:
- Build the system model-agnostic (model id stored on each template).
- Default templates to `anthropic/claude-sonnet-4` and attempt the call through the gateway.
- If the gateway returns "model not available", surface a clear toast and let the admin pick a supported model from a dropdown (Gemini / GPT). No code rewrite needed — just a template edit.
- If you later want guaranteed Claude, we can add an `ANTHROPIC_API_KEY` secret and a direct-call path; out of scope for this plan unless you ask.

## Database (one migration)

New tables:

- `ai_prompt_templates`
  - `key` (unique, e.g. `rule_builder.decision_rules`)
  - `name`, `description`
  - `target_table` (enum: `decision_rules`, `hypotheses`, `observations`, `safety_rules`, … — values driven by what already exists)
  - `model` (text, default `anthropic/claude-sonnet-4`)
  - `temperature` (numeric, default 0.2)
  - `system_prompt` (text)
  - `user_prompt_template` (text, supports `{{variable}}` placeholders)
  - `variables_schema` (jsonb — list of `{key,label,type,required,placeholder}` to render the form)
  - `output_schema` (jsonb — JSON Schema fed to the model as a tool-call definition; defines the shape inserted into `target_table`)
  - `auto_apply` (boolean, default false)
  - `is_active` (boolean, default true)
  - `created_by`, `updated_by`, timestamps

- `ai_prompt_runs` (audit)
  - `template_id`, `input_variables` jsonb, `raw_output` jsonb, `warnings` jsonb, `duplicates` jsonb
  - `status` (`drafted` | `submitted` | `auto_applied` | `failed`)
  - `target_record_id` (nullable — set when auto_applied or after approval)
  - `created_by`, `created_at`

RLS: only super admins (`is_super_admin()`) can select/insert/update/delete on both tables.

Seed: insert default templates for `decision_rules`, `hypotheses`, `observations`, `safety_rules` (the existing governance tables) using current rule-builder prompt as the starting point.

## Edge function

Replace `governance-rule-assistant` with `governance-ai-builder` (or extend it) — single function that:

1. Auths + checks `is_super_admin`.
2. Loads template by `template_key` or `template_id`.
3. Renders `user_prompt_template` with the submitted `variables`.
4. Calls Lovable AI Gateway with `template.model`, `template.temperature`, system prompt, and `output_schema` as the tool definition.
5. Runs validators: required fields per `output_schema`, multilingual narration check (if narration field present), duplicate lookup against `target_table` using a configurable key set on the template.
6. Logs to `ai_prompt_runs`.
7. Returns `{ draft, warnings, duplicates, template, run_id }`.

Second action on same function: `apply` — given `run_id` + (optional) edited payload:
- If `auto_apply` and caller is super admin → insert into `target_table` directly, update run row.
- Else → insert into `rule_approval_workflow` with `proposed_payload` + `target_table` so existing approval queue handles it.

## Frontend

### `src/pages/super-admin/AIRuleBuilder.tsx` (rewrite)
- Template picker (dropdown of active templates grouped by `target_table`).
- Auto-rendered form from `variables_schema` (text/textarea/select/number).
- "Draft with AI" → calls function, shows draft in a structured viewer driven by `output_schema` (reuse current Field component).
- Editable JSON view + reviewer notes.
- Two action buttons depending on `auto_apply` + role: "Submit to Approval Queue" / "Apply directly".
- Show last 10 runs from `ai_prompt_runs` for the chosen template.

### New page `src/pages/super-admin/AIPromptTemplates.tsx`
- List + CRUD for `ai_prompt_templates`.
- Editor with: name/description, target table dropdown, model dropdown (Claude default + Gemini/GPT fallbacks), temperature slider, Monaco-style textareas for system + user prompt, JSON editors for `variables_schema` and `output_schema`, `auto_apply` and `is_active` toggles.
- "Test prompt" button that runs the template against sample variables without persisting.
- Add to Super Admin sidebar under **Governance & Operations** as "AI Prompt Templates".

### Hooks
- `useAIPromptTemplates` — list/get/create/update/delete.
- Update `useGovernanceAI`:
  - `useDraftWithTemplate({ template_key, variables })`
  - `useApplyDraft({ run_id, payload, mode: 'queue' | 'direct' })`
  - `usePromptRuns(template_id)`

## Out of scope
- No changes to the approval queue UI itself (it already handles `proposed_payload` + arbitrary target tables — we'll just start passing `target_table`).
- No new Claude billing/secret management (using gateway).
- No changes to other governance pages.

## Technical details
- Prompt rendering: simple `{{var}}` replace on the server; reject on missing required vars.
- `output_schema` is converted to an OpenAI-style `tools[0].function.parameters` payload at call time so the model returns structured JSON via tool-calling (same pattern as today).
- Duplicate detection: each template can declare `dedupe_keys: string[]`; function does an `eq` lookup on `target_table` for those columns.
- Audit: every draft + apply action writes a row to `ai_prompt_runs` with the user id.
- Backwards compat: keep `governance-rule-assistant` for one release, have it delegate to the new function with the seeded `decision_rules` template key.

## Deliverables
1. Migration: `ai_prompt_templates`, `ai_prompt_runs`, RLS, seed rows.
2. Edge function: `governance-ai-builder` (draft + apply actions).
3. New page: `AIPromptTemplates.tsx` + route + sidebar entry.
4. Rewritten `AIRuleBuilder.tsx` driven by templates.
5. New / updated hooks in `useGovernanceAI.ts` + new `useAIPromptTemplates.ts`.
