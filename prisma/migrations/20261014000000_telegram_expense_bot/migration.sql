BEGIN;

CREATE TYPE app."TelegramDraftStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE app.telegram_connections (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  telegram_user_id varchar(32),
  telegram_chat_id varchar(32),
  link_code_hash varchar(64),
  link_expires_at timestamptz(3),
  default_account_id uuid NOT NULL,
  default_category_id uuid NOT NULL,
  linked_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT telegram_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_connections_workspace_id_user_id_fkey FOREIGN KEY (workspace_id, user_id) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT telegram_link_state_valid CHECK (
    (telegram_user_id IS NULL AND telegram_chat_id IS NULL AND linked_at IS NULL AND link_code_hash IS NOT NULL AND link_expires_at IS NOT NULL)
    OR (telegram_user_id IS NOT NULL AND telegram_chat_id IS NOT NULL AND linked_at IS NOT NULL AND link_code_hash IS NULL AND link_expires_at IS NULL)
  )
);
CREATE UNIQUE INDEX telegram_connections_workspace_id_user_id_key ON app.telegram_connections(workspace_id, user_id);
CREATE UNIQUE INDEX telegram_connections_telegram_user_id_key ON app.telegram_connections(telegram_user_id);
CREATE UNIQUE INDEX telegram_connections_link_code_hash_key ON app.telegram_connections(link_code_hash);
CREATE INDEX telegram_connections_user_id_idx ON app.telegram_connections(user_id);

CREATE TABLE app.telegram_drafts (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES app.telegram_connections(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  source_message_id bigint NOT NULL,
  edit_prompt_message_id bigint,
  status app."TelegramDraftStatus" NOT NULL DEFAULT 'pending',
  title varchar(100) NOT NULL,
  amount bigint NOT NULL,
  note varchar(1000),
  transaction_date date NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid NOT NULL,
  transaction_id uuid,
  expires_at timestamptz(3) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT telegram_draft_amount_positive CHECK (amount > 0),
  CONSTRAINT telegram_draft_title_nonempty CHECK (length(btrim(title)) > 0)
);
CREATE UNIQUE INDEX telegram_drafts_connection_id_source_message_id_key ON app.telegram_drafts(connection_id, source_message_id);
CREATE INDEX telegram_drafts_connection_id_status_expires_at_idx ON app.telegram_drafts(connection_id, status, expires_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.telegram_connections, app.telegram_drafts TO alokasi_runtime;
    GRANT USAGE ON TYPE app."TelegramDraftStatus" TO alokasi_runtime;
  END IF;
END
$$;

COMMIT;
