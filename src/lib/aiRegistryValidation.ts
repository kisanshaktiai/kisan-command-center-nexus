// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/lib/aiRegistryValidation.ts
//
// CHANGE LOG
// 2026-10-04 — AI control plane Phase 2b (admin writes): a faithful port of the AI registry's own
//   database constraints, so a bad value is caught in the form with a readable message instead of
//   coming back as a raw Postgres constraint error. This is a CONVENIENCE LAYER ONLY — the database
//   remains the authority. Every function here mirrors one named constraint or trigger of the
//   farmer-app migrations (20260925120000_ai_model_registry.sql and later), and the name of the
//   constraint it mirrors is quoted above it so the two can be kept in step.
//   Nothing here talks to the network.

export const AI_MODALITIES = ['text', 'image', 'audio'] as const;
export type AiModality = (typeof AI_MODALITIES)[number];

export const AI_MODEL_STATUSES = ['candidate', 'active', 'deprecated', 'retired'] as const;
export type AiModelStatus = (typeof AI_MODEL_STATUSES)[number];

export const AI_TOKEN_PARAMS = ['max_tokens', 'max_completion_tokens'] as const;
export type AiTokenParam = (typeof AI_TOKEN_PARAMS)[number];

export const AI_TEMPERATURE_MODES = ['allowed', 'omit'] as const;
export type AiTemperatureMode = (typeof AI_TEMPERATURE_MODES)[number];

/** The only keys ai_task_route.params accepts — constraint `ai_task_route_params_shape`. */
export const AI_ROUTE_PARAM_KEYS = ['max_output_tokens', 'temperature', 'reasoning_effort', 'json_mode'] as const;

/** ai_task_route_step.step_no BETWEEN 1 AND 9 — constraint `ai_task_route_step_step_no_check`. */
export const AI_MAX_CHAIN_STEPS = 9;

export interface AiContractInput {
  token_param: string;
  temperature: string;
  reasoning_efforts: string[];
}

/** Shape the chain/route checks need, independent of the service's row interfaces. */
export interface AiRouteShape {
  task_key: string;
  required_modalities: string[];
  params: Record<string, unknown>;
}
export interface AiModelShape {
  model_key: string;
  status: string;
  input_modalities: string[];
  api_contract: AiContractInput;
}

const blank = (v: string | null | undefined) => !v || v.trim().length === 0;

/** Constraint `ai_model_catalog_key_format`: model_key is always provider || ':' || api_model_id. */
export const aiModelKey = (provider: string, apiModelId: string) => `${provider.trim()}:${apiModelId.trim()}`;

/**
 * Constraints `ai_model_catalog_api_model_id_check`, `_key_format`, `_status_check`, `_modalities`,
 * `_contract_shape`, `_change_reason_check`, `_replacement_not_self`.
 * Returns a list of human-readable problems; an empty list means the database will accept the row.
 */
export function validateModelInput(input: {
  provider: string;
  api_model_id: string;
  status: string;
  input_modalities: string[];
  api_contract: AiContractInput;
  replacement_model_key?: string | null;
  change_reason: string;
}): string[] {
  const problems: string[] = [];
  if (blank(input.provider)) problems.push('Provider is required.');
  if (blank(input.api_model_id)) problems.push('Model id is required.');
  if (input.api_model_id !== input.api_model_id.trim()) problems.push('Model id must not start or end with a space.');
  if (!AI_MODEL_STATUSES.includes(input.status as AiModelStatus)) {
    problems.push(`Status must be one of ${AI_MODEL_STATUSES.join(', ')}.`);
  }
  problems.push(...validateModalities(input.input_modalities, 'Input types'));
  problems.push(...validateContract(input.api_contract));
  if (blank(input.change_reason)) problems.push('A change reason is required — it is written to the audit log.');
  if (input.replacement_model_key && input.replacement_model_key === aiModelKey(input.provider, input.api_model_id)) {
    problems.push('A model cannot be its own replacement.');
  }
  return problems;
}

/** Constraints `ai_model_catalog_modalities` and `ai_task_route_modalities`. */
export function validateModalities(modalities: string[], label = 'Modalities'): string[] {
  if (!Array.isArray(modalities) || modalities.length === 0) return [`${label}: pick at least one.`];
  const unknown = modalities.filter((m) => !AI_MODALITIES.includes(m as AiModality));
  return unknown.length ? [`${label}: ${unknown.join(', ')} is not one of ${AI_MODALITIES.join(', ')}.`] : [];
}

/** Constraint `ai_model_catalog_contract_shape`. */
export function validateContract(contract: AiContractInput): string[] {
  const problems: string[] = [];
  if (!AI_TOKEN_PARAMS.includes(contract.token_param as AiTokenParam)) {
    problems.push(`Token parameter must be ${AI_TOKEN_PARAMS.join(' or ')}.`);
  }
  if (!AI_TEMPERATURE_MODES.includes(contract.temperature as AiTemperatureMode)) {
    problems.push(`Temperature must be ${AI_TEMPERATURE_MODES.join(' or ')}.`);
  }
  if (!Array.isArray(contract.reasoning_efforts)) {
    problems.push('Reasoning efforts must be a list (empty means the model does not accept the parameter).');
  } else if (contract.reasoning_efforts.some((e) => blank(e))) {
    problems.push('Reasoning efforts must not contain an empty entry.');
  }
  return problems;
}

/** Constraint `ai_task_route_task_key_check`: lower-case dotted segments, at least two. */
export function validateTaskKey(taskKey: string): string[] {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(taskKey)
    ? []
    : ['Job key must be lower-case dotted segments, for example brain.explain or vision.diagnose.'];
}

/**
 * Constraint `ai_task_route_params_shape`. Takes the form's string values and returns either the
 * problems or the typed object the database expects. An empty string means "not set" and the key is
 * left out entirely, which is how the registry stores "use the model default".
 */
export function buildRouteParams(form: {
  max_output_tokens: string;
  temperature: string;
  reasoning_effort: string;
  json_mode: boolean | null;
}): { params: Record<string, unknown>; problems: string[] } {
  const params: Record<string, unknown> = {};
  const problems: string[] = [];

  if (!blank(form.max_output_tokens)) {
    const n = Number(form.max_output_tokens);
    if (!Number.isInteger(n) || n <= 0) problems.push('Max output tokens must be a whole number greater than zero.');
    else params.max_output_tokens = n;
  }
  if (!blank(form.temperature)) {
    const n = Number(form.temperature);
    if (!Number.isFinite(n) || n < 0 || n > 2) problems.push('Temperature must be a number between 0 and 2.');
    else params.temperature = n;
  }
  if (!blank(form.reasoning_effort)) params.reasoning_effort = form.reasoning_effort.trim();
  if (form.json_mode !== null) params.json_mode = form.json_mode;

  return { params, problems };
}

/**
 * Port of the database function `ai_route_model_problem(ai_task_route, ai_model_catalog)`, which the
 * BEFORE triggers on ai_task_route_step and ai_task_route both call. Returns the reason this model
 * cannot serve this job, or null when it can. Used to filter the model picker so the admin is only
 * offered models the database will actually accept.
 */
export function routeModelProblem(route: AiRouteShape, model: AiModelShape): string | null {
  if (model.status !== 'active' && model.status !== 'deprecated') {
    return `${model.model_key} is ${model.status}; only active or deprecated models can be routed.`;
  }
  const missing = route.required_modalities.filter((m) => !model.input_modalities.includes(m));
  if (missing.length > 0) {
    return `${model.model_key} accepts ${model.input_modalities.join(', ')} but ${route.task_key} needs ${route.required_modalities.join(', ')}.`;
  }
  const effort = route.params?.reasoning_effort;
  const accepted = model.api_contract?.reasoning_efforts ?? [];
  if (typeof effort === 'string' && accepted.length > 0 && !accepted.includes(effort)) {
    return `${model.model_key} does not accept reasoning effort "${effort}" (it accepts ${accepted.join(', ')}).`;
  }
  return null;
}

/**
 * Constraints `ai_task_route_step_step_no_check` and `ai_task_route_step_model_once`, plus the
 * guard trigger that rejects an incompatible model. `modelKeys` is the chain in the order the admin
 * arranged it; step_no is assigned from its position.
 */
export function validateChain(
  route: AiRouteShape,
  modelKeys: string[],
  modelsByKey: Map<string, AiModelShape>,
): string[] {
  const problems: string[] = [];
  if (modelKeys.length > AI_MAX_CHAIN_STEPS) {
    problems.push(`A chain can hold at most ${AI_MAX_CHAIN_STEPS} models.`);
  }
  const seen = new Set<string>();
  for (const key of modelKeys) {
    if (seen.has(key)) problems.push(`${key} appears twice — a model may only appear once in a chain.`);
    seen.add(key);
    const model = modelsByKey.get(key);
    if (!model) {
      problems.push(`${key} is not in the model catalog.`);
      continue;
    }
    const problem = routeModelProblem(route, model);
    if (problem) problems.push(problem);
  }
  return problems;
}

/**
 * ai_model_pricing: non-negative costs, and `ai_model_pricing_cached_input_nonneg`. Prices are
 * entered per MILLION tokens, the unit providers publish, and stored per 1k as the table requires.
 */
export function buildPricing(form: {
  input_per_million: string;
  cached_input_per_million: string;
  output_per_million: string;
  effective_from: string;
}): {
  values: { input_cost_per_1k: number; cached_input_cost_per_1k: number | null; output_cost_per_1k: number; effective_from: string };
  problems: string[];
} {
  const problems: string[] = [];
  const perThousand = (raw: string, label: string, required: boolean): number | null => {
    if (blank(raw)) {
      if (required) problems.push(`${label} is required.`);
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      problems.push(`${label} must be zero or more.`);
      return null;
    }
    // Stored per 1k tokens; rounded to the column's 6 decimal places.
    return Number((n / 1000).toFixed(6));
  };

  const input = perThousand(form.input_per_million, 'Input price', true);
  const cached = perThousand(form.cached_input_per_million, 'Cached input price', false);
  const output = perThousand(form.output_per_million, 'Output price', true);
  if (blank(form.effective_from)) problems.push('Effective-from date is required.');

  return {
    values: {
      input_cost_per_1k: input ?? 0,
      cached_input_cost_per_1k: cached,
      output_cost_per_1k: output ?? 0,
      effective_from: form.effective_from,
    },
    problems,
  };
}
