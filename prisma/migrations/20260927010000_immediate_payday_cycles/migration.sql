BEGIN;

-- Multiple cycle changes may be applied on the same local date. Version remains
-- the monotonic concurrency key; effective_date records when each version applied.
ALTER TABLE app.cycle_settings
  DROP CONSTRAINT cycle_setting_workspace_effective_key;

COMMIT;
