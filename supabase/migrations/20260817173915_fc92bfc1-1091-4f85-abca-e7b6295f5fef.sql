CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND OLD.is_active THEN
      SELECT count(*) INTO remaining
      FROM public.admin_users
      WHERE role = 'super_admin' AND is_active AND id <> OLD.id;
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Cannot remove the only active super_admin'
          USING ERRCODE = 'raise_exception';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.role = 'super_admin' AND OLD.is_active
     AND (NEW.role <> 'super_admin' OR NEW.is_active IS DISTINCT FROM true) THEN
    SELECT count(*) INTO remaining
    FROM public.admin_users
    WHERE role = 'super_admin' AND is_active AND id <> OLD.id;
    IF remaining = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate or demote the only active super_admin'
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_super_admin_removal ON public.admin_users;
CREATE TRIGGER trg_prevent_last_super_admin_removal
BEFORE UPDATE OR DELETE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_super_admin_removal();