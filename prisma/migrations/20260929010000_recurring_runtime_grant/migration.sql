BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON app.recurring_transaction_templates
      TO alokasi_runtime;
  END IF;
END
$$;

COMMIT;
