
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  target_table text NOT NULL,
  model text NOT NULL DEFAULT 'anthropic/claude-sonnet-4',
  temperature numeric NOT NULL DEFAULT 0.2,
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  variables_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_apply boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_prompt_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.ai_prompt_templates(id) ON DELETE CASCADE,
  input_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_output jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicates jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'drafted',
  target_table text,
  target_record_id uuid,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_template ON public.ai_prompt_runs(template_id, created_at DESC);

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admins manage prompt templates" ON public.ai_prompt_templates;
CREATE POLICY "super admins manage prompt templates" ON public.ai_prompt_templates
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super admins manage prompt runs" ON public.ai_prompt_runs;
CREATE POLICY "super admins manage prompt runs" ON public.ai_prompt_runs
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.touch_ai_prompt_templates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_ai_prompt_templates ON public.ai_prompt_templates;
CREATE TRIGGER trg_touch_ai_prompt_templates BEFORE UPDATE ON public.ai_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_prompt_templates();

-- Seed defaults
INSERT INTO public.ai_prompt_templates (key, name, description, target_table, model, system_prompt, user_prompt_template, variables_schema, output_schema, dedupe_keys)
VALUES
('rule_builder.decision_rules',
 'Decision Rule Drafter',
 'Drafts a decision_rules row from crop/stage/observation context.',
 'decision_rules',
 'anthropic/claude-sonnet-4',
 'You are an agronomy rule architect for KisanShaktiAI. Given a crop, stage, observation and free-text intent, draft a JSON proposal for a decision_rules row. Return strictly the tool call. Keep narration short, factual, multilingual (en/hi/mr). Never invent banned chemicals. If unsure, leave fields null.',
 'Crop: {{crop_code}}\nStage: {{stage}}\nObservation: {{observation}}\nPlant part: {{plant_part}}\nAgronomist intent: {{intent}}',
 '[{"key":"crop_code","label":"Crop code","type":"text","required":true},{"key":"stage","label":"Stage","type":"text","required":true},{"key":"observation","label":"Observation","type":"text","required":true},{"key":"plant_part","label":"Plant part","type":"text"},{"key":"intent","label":"Agronomist intent","type":"textarea"}]'::jsonb,
 '{"type":"object","required":["crop_code","stage","observation","narration","rationale"],"properties":{"crop_code":{"type":"string"},"stage":{"type":"string"},"observation":{"type":"string"},"plant_part":{"type":"string"},"action_type":{"type":"string"},"ipm_level":{"type":"string","enum":["cultural","biological","chemical","monitoring"]},"bee_toxicity":{"type":"string","enum":["none","low","moderate","high","unknown"]},"confidence":{"type":"number","minimum":0,"maximum":1},"conditions_json":{"type":"object","additionalProperties":true},"narration":{"type":"object","required":["en"],"properties":{"en":{"type":"string"},"hi":{"type":"string"},"mr":{"type":"string"}}},"rationale":{"type":"string"}}}'::jsonb,
 '["crop_code","stage","observation"]'::jsonb),
('rule_builder.hypotheses',
 'Hypothesis Drafter',
 'Drafts a hypothesis row to be validated by agronomists.',
 'hypotheses',
 'anthropic/claude-sonnet-4',
 'You are a research agronomist drafting falsifiable hypotheses for KisanShaktiAI. Be specific, measurable, and cite plausible mechanisms. Multilingual narration en/hi/mr.',
 'Topic: {{topic}}\nCrop: {{crop_code}}\nContext: {{context}}',
 '[{"key":"topic","label":"Topic","type":"text","required":true},{"key":"crop_code","label":"Crop code","type":"text","required":true},{"key":"context","label":"Context","type":"textarea"}]'::jsonb,
 '{"type":"object","required":["title","statement","rationale"],"properties":{"title":{"type":"string"},"statement":{"type":"string"},"rationale":{"type":"string"},"crop_code":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1},"narration":{"type":"object","properties":{"en":{"type":"string"},"hi":{"type":"string"},"mr":{"type":"string"}}}}}'::jsonb,
 '["title","crop_code"]'::jsonb),
('rule_builder.observation_master',
 'Observation Master Drafter',
 'Drafts a canonical observation entry with multilingual labels.',
 'observation_master',
 'anthropic/claude-sonnet-4',
 'You are curating canonical agronomy observations. Output crisp labels and multilingual translations en/hi/mr. Avoid duplicates.',
 'Crop: {{crop_code}}\nObservation phrase: {{phrase}}\nPlant part: {{plant_part}}',
 '[{"key":"crop_code","label":"Crop code","type":"text","required":true},{"key":"phrase","label":"Observation phrase","type":"text","required":true},{"key":"plant_part","label":"Plant part","type":"text"}]'::jsonb,
 '{"type":"object","required":["code","label_en"],"properties":{"code":{"type":"string"},"label_en":{"type":"string"},"label_hi":{"type":"string"},"label_mr":{"type":"string"},"crop_code":{"type":"string"},"plant_part":{"type":"string"},"category":{"type":"string"}}}'::jsonb,
 '["code"]'::jsonb),
('rule_builder.safety_verifications',
 'Safety Verification Drafter',
 'Drafts a safety/regulatory verification entry for a chemical or practice.',
 'safety_verifications',
 'anthropic/claude-sonnet-4',
 'You are a pesticide safety reviewer. Be conservative. Cite known regulatory references (CIB&RC India where relevant). Never invent banned chemicals.',
 'Subject: {{subject}}\nCrop: {{crop_code}}\nConcern: {{concern}}',
 '[{"key":"subject","label":"Subject (chemical/practice)","type":"text","required":true},{"key":"crop_code","label":"Crop code","type":"text"},{"key":"concern","label":"Concern","type":"textarea","required":true}]'::jsonb,
 '{"type":"object","required":["subject","verdict","rationale"],"properties":{"subject":{"type":"string"},"verdict":{"type":"string","enum":["approved","conditional","rejected","unknown"]},"rationale":{"type":"string"},"references":{"type":"array","items":{"type":"string"}},"bee_toxicity":{"type":"string","enum":["none","low","moderate","high","unknown"]}}}'::jsonb,
 '["subject","crop_code"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
