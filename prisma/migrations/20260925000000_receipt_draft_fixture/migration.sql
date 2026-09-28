BEGIN;

CREATE TYPE app."ReceiptDraftStatus" AS ENUM ('needs_review', 'submitted', 'cancelled');

CREATE TABLE app.receipt_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  status app."ReceiptDraftStatus" NOT NULL DEFAULT 'needs_review',
  source_kind varchar(30) NOT NULL DEFAULT 'fixture',
  extracted_amount bigint,
  extracted_transaction_date date,
  extracted_merchant varchar(200),
  extracted_note varchar(1000),
  suggested_category_id uuid,
  amount_confidence smallint,
  date_confidence smallint,
  merchant_confidence smallint,
  category_confidence smallint,
  corrected_amount bigint,
  corrected_transaction_date date,
  corrected_merchant varchar(200),
  corrected_note varchar(1000),
  selected_account_id uuid,
  selected_category_id uuid,
  category_type app."TransactionType" NOT NULL DEFAULT 'expense',
  submitted_transaction_id uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  submitted_at timestamptz(3),
  cancelled_at timestamptz(3),
  CONSTRAINT receipt_draft_workspace_id_key UNIQUE (workspace_id, id),
  CONSTRAINT receipt_draft_submitted_transaction_key UNIQUE (workspace_id, submitted_transaction_id),
  CONSTRAINT receipt_draft_workspace_fk FOREIGN KEY (workspace_id)
    REFERENCES app.workspaces(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT receipt_draft_creator_fk FOREIGN KEY (workspace_id, created_by)
    REFERENCES app.memberships(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT receipt_draft_suggested_category_fk FOREIGN KEY (workspace_id, suggested_category_id, category_type)
    REFERENCES app.categories(workspace_id, id, type) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT receipt_draft_selected_category_fk FOREIGN KEY (workspace_id, selected_category_id, category_type)
    REFERENCES app.categories(workspace_id, id, type) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT receipt_draft_selected_account_fk FOREIGN KEY (workspace_id, selected_account_id)
    REFERENCES app.financial_accounts(workspace_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT receipt_draft_submitted_transaction_fk FOREIGN KEY (workspace_id, submitted_transaction_id)
    REFERENCES app.transactions(workspace_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT receipt_draft_fixture_valid CHECK (
    source_kind = 'fixture' AND category_type = 'expense' AND version > 0 AND
    (extracted_amount IS NULL OR extracted_amount > 0) AND
    (corrected_amount IS NULL OR corrected_amount > 0) AND
    (amount_confidence IS NULL OR amount_confidence BETWEEN 0 AND 100) AND
    (date_confidence IS NULL OR date_confidence BETWEEN 0 AND 100) AND
    (merchant_confidence IS NULL OR merchant_confidence BETWEEN 0 AND 100) AND
    (category_confidence IS NULL OR category_confidence BETWEEN 0 AND 100)
  ),
  CONSTRAINT receipt_draft_state_valid CHECK (
    (status = 'needs_review' AND submitted_transaction_id IS NULL AND submitted_at IS NULL AND cancelled_at IS NULL) OR
    (status = 'submitted' AND corrected_amount IS NOT NULL AND corrected_transaction_date IS NOT NULL AND
      selected_account_id IS NOT NULL AND selected_category_id IS NOT NULL AND submitted_transaction_id IS NOT NULL AND
      submitted_at IS NOT NULL AND cancelled_at IS NULL) OR
    (status = 'cancelled' AND submitted_transaction_id IS NULL AND submitted_at IS NULL AND cancelled_at IS NOT NULL)
  )
);

CREATE INDEX receipt_draft_owner_status_idx
  ON app.receipt_drafts(workspace_id, created_by, status, created_at);

REVOKE ALL ON app.receipt_drafts FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.receipt_drafts TO alokasi_runtime;
  END IF;
END;
$$;

COMMIT;
