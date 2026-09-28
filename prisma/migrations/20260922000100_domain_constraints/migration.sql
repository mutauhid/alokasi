-- These constraints are deliberately versioned SQL: Prisma cannot express them.
BEGIN;
ALTER TABLE app.workspaces ADD CONSTRAINT workspace_valid CHECK (
  currency = 'IDR' AND version > 0 AND length(btrim(name)) > 0
  AND ((type = 'personal' AND personal_owner_id IS NOT NULL)
    OR (type = 'shared' AND personal_owner_id IS NULL))
);
ALTER TABLE app.users ADD CONSTRAINT user_identity_or_disabled CHECK (
  disabled_at IS NOT NULL OR (auth_subject IS NOT NULL AND email IS NOT NULL)
);
ALTER TABLE app.memberships ADD CONSTRAINT membership_version CHECK (version > 0);
CREATE UNIQUE INDEX one_active_owner ON app.memberships(workspace_id)
  WHERE role = 'owner' AND status = 'active';

ALTER TABLE app.financial_accounts ADD CONSTRAINT account_valid CHECK (
  version > 0 AND length(btrim(name)) > 0
);
ALTER TABLE app.categories ADD CONSTRAINT category_valid CHECK (
  type IN ('income', 'expense') AND version > 0
  AND length(name) BETWEEN 1 AND 50
  AND name = btrim(regexp_replace(normalize(name, NFC), '[[:space:]]+', ' ', 'g'))
  AND name_key = lower(name)
);
ALTER TABLE app.transactions ADD CONSTRAINT transaction_valid CHECK (
  amount > 0 AND version > 0 AND length(btrim(idempotency_key)) > 0
  AND request_hash ~ '^[0-9a-f]{64}$'
  AND (
    (type = 'transfer' AND category_id IS NULL AND destination_account_id IS NOT NULL AND destination_account_id <> account_id)
    OR (type IN ('income', 'expense') AND category_id IS NOT NULL AND destination_account_id IS NULL)
  )
);
ALTER TABLE app.budgets ADD CONSTRAINT budget_valid CHECK (
  category_type = 'expense' AND limit_amount > 0 AND version > 0
);
ALTER TABLE app.budget_periods ADD CONSTRAINT period_calendar_p0 CHECK (
  start_date < end_date_exclusive AND cycle_setting_version = 1 AND NOT is_transition
  AND extract(day FROM start_date) = 1
  AND end_date_exclusive = (start_date + interval '1 month')::date
);
ALTER TABLE app.invitations ADD CONSTRAINT invitation_valid CHECK (
  role IN ('editor', 'viewer') AND token_hash ~ '^[0-9a-f]{64}$'
  AND expires_at = created_at + interval '7 days'
  AND NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)
  AND (accepted_at IS NULL OR (accepted_at >= created_at AND accepted_at < expires_at))
);

-- Serialize membership/period changes per workspace before evaluating deferred
-- cross-row rules. Updates cannot move these records between workspaces.
CREATE FUNCTION app.lock_workspace() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.workspace_id <> OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN target := OLD.workspace_id; ELSE target := NEW.workspace_id; END IF;
  PERFORM 1 FROM app.workspaces WHERE id = target FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER membership_lock BEFORE INSERT OR UPDATE OR DELETE ON app.memberships
  FOR EACH ROW EXECUTE FUNCTION app.lock_workspace();
CREATE TRIGGER period_lock BEFORE INSERT OR UPDATE OR DELETE ON app.budget_periods
  FOR EACH ROW EXECUTE FUNCTION app.lock_workspace();

CREATE FUNCTION app.check_workspace_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; w app.workspaces%ROWTYPE; owners integer;
BEGIN
  IF TG_TABLE_NAME = 'workspaces' THEN target := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN target := OLD.workspace_id;
  ELSE target := NEW.workspace_id; END IF;
  SELECT * INTO w FROM app.workspaces WHERE id = target;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO owners FROM app.memberships
    WHERE workspace_id = target AND status = 'active' AND role = 'owner';
  IF owners <> 1 THEN RAISE EXCEPTION 'workspace requires exactly one active owner' USING ERRCODE = '23514'; END IF;
  IF w.type = 'personal' AND EXISTS (
    SELECT 1 FROM app.memberships WHERE workspace_id = target
      AND (user_id <> w.personal_owner_id OR role <> 'owner' OR status <> 'active')
  ) THEN RAISE EXCEPTION 'personal workspace only accepts its owner' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER workspace_owner_check AFTER INSERT OR UPDATE ON app.workspaces
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_workspace_owner();
CREATE CONSTRAINT TRIGGER membership_owner_check AFTER INSERT OR UPDATE OR DELETE ON app.memberships
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_workspace_owner();

CREATE FUNCTION app.check_period_contiguity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target := OLD.workspace_id; ELSE target := NEW.workspace_id; END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT start_date, lag(end_date_exclusive) OVER (ORDER BY start_date) AS previous_end
      FROM app.budget_periods WHERE workspace_id = target
    ) periods WHERE previous_end IS NOT NULL AND previous_end <> start_date
  ) THEN RAISE EXCEPTION 'budget periods must be contiguous' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER period_contiguity_check AFTER INSERT OR UPDATE OR DELETE ON app.budget_periods
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_period_contiguity();

-- app is a private backend schema, not a Supabase Data API schema.
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA app FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA app FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM %I', role_name);
    END IF;
  END LOOP;
END;
$$;
COMMIT;
