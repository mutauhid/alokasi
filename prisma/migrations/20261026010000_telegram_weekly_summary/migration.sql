BEGIN;

ALTER TABLE app.telegram_connections
  ADD COLUMN weekly_summary_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN weekly_summary_claimed_week date,
  ADD COLUMN weekly_summary_sent_at timestamptz(3);

COMMIT;
