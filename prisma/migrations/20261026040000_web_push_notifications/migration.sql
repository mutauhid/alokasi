CREATE TYPE app."WebPushNotificationType" AS ENUM (
  'budget_alert', 'weekly_summary', 'recurring_reminder',
  'low_balance', 'stale_draft', 'shared_activity'
);

CREATE TYPE app."WebPushDeliveryStatus" AS ENUM (
  'pending', 'sending', 'sent', 'failed'
);

CREATE TABLE app.web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint_hash varchar(64) NOT NULL,
  endpoint text NOT NULL,
  p256dh varchar(180) NOT NULL,
  auth varchar(64) NOT NULL,
  user_agent varchar(300),
  revoked_at timestamptz(3),
  last_seen_at timestamptz(3) NOT NULL DEFAULT now(),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT web_push_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX web_push_subscriptions_endpoint_hash_key ON app.web_push_subscriptions(endpoint_hash);
CREATE UNIQUE INDEX web_push_subscriptions_user_id_id_key ON app.web_push_subscriptions(user_id, id);
CREATE INDEX web_push_subscriptions_user_revoked_idx ON app.web_push_subscriptions(user_id, revoked_at);

CREATE TABLE app.web_push_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  budget_alerts_enabled boolean NOT NULL DEFAULT true,
  weekly_summary_enabled boolean NOT NULL DEFAULT true,
  recurring_reminders_enabled boolean NOT NULL DEFAULT true,
  low_balance_enabled boolean NOT NULL DEFAULT false,
  low_balance_threshold bigint,
  stale_drafts_enabled boolean NOT NULL DEFAULT true,
  shared_activity_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start smallint,
  quiet_hours_end smallint,
  hide_sensitive_content boolean NOT NULL DEFAULT true,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT web_push_preferences_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_preferences_membership_fkey FOREIGN KEY (workspace_id, user_id) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_preferences_low_balance_valid CHECK (low_balance_threshold IS NULL OR low_balance_threshold > 0),
  CONSTRAINT web_push_preferences_quiet_hours_valid CHECK ((quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR (quiet_hours_start BETWEEN 0 AND 1439 AND quiet_hours_end BETWEEN 0 AND 1439 AND quiet_hours_start <> quiet_hours_end))
);
CREATE UNIQUE INDEX web_push_preferences_workspace_user_key ON app.web_push_preferences(workspace_id, user_id);

CREATE TABLE app.web_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  type app."WebPushNotificationType" NOT NULL,
  dedupe_key varchar(220) NOT NULL,
  title varchar(120) NOT NULL,
  body varchar(300) NOT NULL,
  url varchar(500) NOT NULL,
  tag varchar(120) NOT NULL,
  status app."WebPushDeliveryStatus" NOT NULL DEFAULT 'pending',
  available_at timestamptz(3) NOT NULL DEFAULT now(),
  attempted_at timestamptz(3),
  sent_at timestamptz(3),
  failure_code varchar(40),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT web_push_deliveries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_deliveries_membership_fkey FOREIGN KEY (workspace_id, user_id) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_deliveries_subscription_id_fkey FOREIGN KEY (user_id, subscription_id) REFERENCES app.web_push_subscriptions(user_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_deliveries_url_local CHECK (url LIKE '/%')
);
CREATE UNIQUE INDEX web_push_deliveries_subscription_dedupe_key ON app.web_push_deliveries(subscription_id, dedupe_key);
CREATE INDEX web_push_deliveries_status_available_created_idx ON app.web_push_deliveries(status, available_at, created_at);
CREATE INDEX web_push_deliveries_workspace_user_type_idx ON app.web_push_deliveries(workspace_id, user_id, type);

CREATE TABLE app.web_push_low_balance_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  is_below boolean NOT NULL DEFAULT false,
  last_notified_at timestamptz(3),
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT web_push_low_balance_states_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_low_balance_states_membership_fkey FOREIGN KEY (workspace_id, user_id) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT web_push_low_balance_states_account_fkey FOREIGN KEY (workspace_id, account_id) REFERENCES app.financial_accounts(workspace_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX web_push_low_balance_states_workspace_user_account_key ON app.web_push_low_balance_states(workspace_id, user_id, account_id);
CREATE INDEX web_push_low_balance_states_workspace_account_idx ON app.web_push_low_balance_states(workspace_id, account_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT USAGE ON TYPE app."WebPushNotificationType", app."WebPushDeliveryStatus" TO alokasi_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.web_push_subscriptions, app.web_push_preferences, app.web_push_deliveries, app.web_push_low_balance_states TO alokasi_runtime;
  END IF;
END $$;
