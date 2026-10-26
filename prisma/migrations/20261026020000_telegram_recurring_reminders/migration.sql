BEGIN;

ALTER TABLE app.telegram_connections
  ADD COLUMN recurring_reminders_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE app.telegram_recurring_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  template_id uuid NOT NULL,
  due_date date NOT NULL,
  status app."TelegramBudgetAlertStatus" NOT NULL DEFAULT 'pending',
  attempted_at timestamptz(3),
  sent_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT telegram_recurring_reminders_connection_fkey
    FOREIGN KEY (workspace_id, connection_id)
    REFERENCES app.telegram_connections(workspace_id, id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_recurring_reminders_template_fkey
    FOREIGN KEY (workspace_id, template_id)
    REFERENCES app.recurring_transaction_templates(workspace_id, id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_recurring_reminders_workspace_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES app.workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX telegram_recurring_reminders_connection_template_due_key
  ON app.telegram_recurring_reminders(connection_id, template_id, due_date);
CREATE INDEX telegram_recurring_reminders_connection_status_created_idx
  ON app.telegram_recurring_reminders(connection_id, status, created_at);
CREATE INDEX telegram_recurring_reminders_workspace_template_idx
  ON app.telegram_recurring_reminders(workspace_id, template_id);

COMMIT;
