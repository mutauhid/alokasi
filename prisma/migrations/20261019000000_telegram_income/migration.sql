BEGIN;

ALTER TABLE app.telegram_connections
  ADD COLUMN default_income_category_id uuid;

ALTER TABLE app.telegram_drafts
  ADD COLUMN type app."TransactionType" NOT NULL DEFAULT 'expense';

ALTER TABLE app.telegram_drafts
  ADD CONSTRAINT telegram_draft_type_supported
  CHECK (type IN ('income', 'expense'));

COMMIT;
