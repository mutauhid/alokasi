ALTER TABLE app.recurring_transaction_templates
  ADD COLUMN reminder_minute smallint NOT NULL DEFAULT 540,
  ADD CONSTRAINT recurring_transaction_templates_reminder_minute_valid
    CHECK (reminder_minute BETWEEN 0 AND 1439 AND reminder_minute % 60 = 0);

CREATE TABLE app.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type app."WebPushNotificationType" NOT NULL,
  dedupe_key varchar(220) NOT NULL,
  title varchar(120) NOT NULL,
  body varchar(300) NOT NULL,
  url varchar(500) NOT NULL,
  read_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT in_app_notifications_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT in_app_notifications_membership_fkey
    FOREIGN KEY (workspace_id, user_id) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT in_app_notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT in_app_notifications_url_local CHECK (url LIKE '/%')
);

CREATE UNIQUE INDEX in_app_notifications_workspace_user_dedupe_key
  ON app.in_app_notifications(workspace_id, user_id, dedupe_key);
CREATE INDEX in_app_notifications_workspace_user_read_created_idx
  ON app.in_app_notifications(workspace_id, user_id, read_at, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.in_app_notifications TO alokasi_runtime;
  END IF;
END $$;
