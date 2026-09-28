BEGIN;

CREATE TABLE app.cycle_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  start_day smallint NOT NULL,
  effective_date date NOT NULL,
  version integer NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT cycle_setting_workspace_fk FOREIGN KEY (workspace_id)
    REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cycle_setting_valid CHECK (start_day BETWEEN 1 AND 31 AND version > 0),
  CONSTRAINT cycle_setting_workspace_version_key UNIQUE (workspace_id, version),
  CONSTRAINT cycle_setting_workspace_effective_key UNIQUE (workspace_id, effective_date)
);

INSERT INTO app.cycle_settings (workspace_id, start_day, effective_date, version)
SELECT w.id, 1,
  COALESCE(min(p.start_date), date_trunc('month', current_date)::date), 1
FROM app.workspaces w
LEFT JOIN app.budget_periods p ON p.workspace_id = w.id
GROUP BY w.id;

ALTER TABLE app.budget_periods DROP CONSTRAINT period_calendar_p0;
ALTER TABLE app.budget_periods ADD CONSTRAINT period_valid CHECK (
  start_date < end_date_exclusive AND cycle_setting_version > 0
);
ALTER TABLE app.budget_periods ADD CONSTRAINT budget_period_cycle_setting_fk
  FOREIGN KEY (workspace_id, cycle_setting_version)
  REFERENCES app.cycle_settings(workspace_id, version)
  ON DELETE RESTRICT ON UPDATE RESTRICT;

REVOKE ALL ON app.cycle_settings FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.cycle_settings TO alokasi_runtime;
  END IF;
END;
$$;

COMMIT;
