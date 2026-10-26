BEGIN;

CREATE TYPE app."TelegramBudgetAlertStatus" AS ENUM (
  'pending',
  'sending',
  'sent',
  'failed'
);

ALTER TABLE app.telegram_connections
  ADD COLUMN budget_alerts_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX telegram_connections_workspace_id_id_key
  ON app.telegram_connections(workspace_id, id);

CREATE UNIQUE INDEX budgets_workspace_id_id_key
  ON app.budgets(workspace_id, id);

CREATE TABLE app.telegram_budget_alerts (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  budget_id uuid NOT NULL,
  threshold smallint NOT NULL,
  actual_amount bigint NOT NULL,
  limit_amount bigint NOT NULL,
  status app."TelegramBudgetAlertStatus" NOT NULL DEFAULT 'pending',
  attempted_at timestamptz(3),
  sent_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT telegram_budget_alerts_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_budget_alerts_workspace_connection_fkey
    FOREIGN KEY (workspace_id, connection_id)
    REFERENCES app.telegram_connections(workspace_id, id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_budget_alerts_workspace_budget_fkey
    FOREIGN KEY (workspace_id, budget_id)
    REFERENCES app.budgets(workspace_id, id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_budget_alert_threshold_valid
    CHECK (threshold IN (80, 100)),
  CONSTRAINT telegram_budget_alert_amounts_valid
    CHECK (actual_amount >= 0 AND limit_amount > 0)
);

CREATE UNIQUE INDEX telegram_budget_alerts_connection_budget_threshold_key
  ON app.telegram_budget_alerts(connection_id, budget_id, threshold);
CREATE INDEX telegram_budget_alerts_connection_status_created_at_idx
  ON app.telegram_budget_alerts(connection_id, status, created_at);
CREATE INDEX telegram_budget_alerts_workspace_budget_idx
  ON app.telegram_budget_alerts(workspace_id, budget_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.telegram_budget_alerts TO alokasi_runtime;
    GRANT USAGE ON TYPE app."TelegramBudgetAlertStatus" TO alokasi_runtime;
  END IF;
END
$$;

COMMIT;
