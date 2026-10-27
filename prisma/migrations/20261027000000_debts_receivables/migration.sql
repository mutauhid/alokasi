CREATE TYPE app."DebtKind" AS ENUM ('debt', 'receivable');
CREATE TYPE app."DebtOrigin" AS ENUM ('current', 'historical');

ALTER TYPE app."WebPushNotificationType" ADD VALUE 'debt_due';

ALTER TABLE app.web_push_preferences
  ADD COLUMN debt_due_reminders_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE app.debt_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  kind app."DebtKind" NOT NULL,
  origin app."DebtOrigin" NOT NULL,
  counterparty varchar(100) NOT NULL,
  title varchar(100) NOT NULL,
  principal_amount bigint NOT NULL,
  start_date date NOT NULL,
  due_date date,
  account_id uuid,
  note varchar(1000),
  idempotency_key varchar(128) NOT NULL,
  request_hash varchar(64) NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT debt_records_workspace_fkey
    FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_records_creator_fkey
    FOREIGN KEY (workspace_id, created_by) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_records_account_fkey
    FOREIGN KEY (workspace_id, account_id) REFERENCES app.financial_accounts(workspace_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_records_amount_positive CHECK (principal_amount > 0),
  CONSTRAINT debt_records_due_date_valid CHECK (due_date IS NULL OR due_date >= start_date),
  CONSTRAINT debt_records_origin_account_valid CHECK (
    (origin = 'current' AND account_id IS NOT NULL)
    OR (origin = 'historical' AND account_id IS NULL)
  )
);

CREATE UNIQUE INDEX debt_records_workspace_id_id_key
  ON app.debt_records(workspace_id, id);
CREATE UNIQUE INDEX debt_records_workspace_creator_idempotency_key
  ON app.debt_records(workspace_id, created_by, idempotency_key);
CREATE INDEX debt_records_workspace_kind_due_idx
  ON app.debt_records(workspace_id, kind, due_date);
CREATE INDEX debt_records_workspace_account_start_idx
  ON app.debt_records(workspace_id, account_id, start_date);

CREATE TABLE app.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  debt_record_id uuid NOT NULL,
  created_by uuid NOT NULL,
  account_id uuid NOT NULL,
  amount bigint NOT NULL,
  payment_date date NOT NULL,
  note varchar(500),
  idempotency_key varchar(128) NOT NULL,
  request_hash varchar(64) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT debt_payments_workspace_fkey
    FOREIGN KEY (workspace_id) REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_payments_record_fkey
    FOREIGN KEY (workspace_id, debt_record_id) REFERENCES app.debt_records(workspace_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_payments_creator_fkey
    FOREIGN KEY (workspace_id, created_by) REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_payments_account_fkey
    FOREIGN KEY (workspace_id, account_id) REFERENCES app.financial_accounts(workspace_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT debt_payments_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX debt_payments_workspace_id_id_key
  ON app.debt_payments(workspace_id, id);
CREATE UNIQUE INDEX debt_payments_workspace_creator_idempotency_key
  ON app.debt_payments(workspace_id, created_by, idempotency_key);
CREATE INDEX debt_payments_workspace_record_date_idx
  ON app.debt_payments(workspace_id, debt_record_id, payment_date, created_at);
CREATE INDEX debt_payments_workspace_account_date_idx
  ON app.debt_payments(workspace_id, account_id, payment_date);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT USAGE ON TYPE app."DebtKind", app."DebtOrigin" TO alokasi_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.debt_records, app.debt_payments TO alokasi_runtime;
  END IF;
END $$;
