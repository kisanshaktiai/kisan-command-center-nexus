
CREATE OR REPLACE FUNCTION public.governance_simulate_rule(p_rule_id uuid, p_sample_input jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, governance
AS $$ SELECT governance.simulate_rule(p_rule_id, p_sample_input); $$;

CREATE OR REPLACE FUNCTION public.governance_transition_approval_state(p_workflow_id uuid, p_new_state text, p_notes text DEFAULT NULL)
RETURNS public.rule_approval_workflow LANGUAGE sql SECURITY DEFINER SET search_path = public, governance
AS $$ SELECT governance.transition_approval_state(p_workflow_id, p_new_state, p_notes); $$;

CREATE OR REPLACE FUNCTION public.governance_rollback_rule_to_version(p_version_id uuid, p_notes text DEFAULT NULL)
RETURNS public.rule_approval_workflow LANGUAGE sql SECURITY DEFINER SET search_path = public, governance
AS $$ SELECT governance.rollback_rule_to_version(p_version_id, p_notes); $$;

REVOKE ALL ON FUNCTION public.governance_simulate_rule(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_transition_approval_state(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_rollback_rule_to_version(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.governance_simulate_rule(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_transition_approval_state(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_rollback_rule_to_version(uuid, text) TO authenticated;
