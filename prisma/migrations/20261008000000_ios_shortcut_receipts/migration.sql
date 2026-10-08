BEGIN;

ALTER TABLE app.memberships
  ADD COLUMN shortcut_token_hash varchar(64),
  ADD COLUMN shortcut_token_created_at timestamptz(3),
  ADD COLUMN shortcut_token_expires_at timestamptz(3),
  ADD COLUMN shortcut_token_last_used_at timestamptz(3),
  ADD COLUMN shortcut_default_account_id uuid,
  ADD COLUMN shortcut_default_category_id uuid,
  ADD CONSTRAINT membership_shortcut_token_valid CHECK (
    (
      shortcut_token_hash IS NULL
      AND shortcut_token_created_at IS NULL
      AND shortcut_token_expires_at IS NULL
      AND shortcut_token_last_used_at IS NULL
      AND shortcut_default_account_id IS NULL
      AND shortcut_default_category_id IS NULL
    )
    OR
    (
      shortcut_token_hash ~ '^[0-9a-f]{64}$'
      AND shortcut_token_created_at IS NOT NULL
      AND shortcut_token_expires_at > shortcut_token_created_at
      AND shortcut_default_account_id IS NOT NULL
      AND shortcut_default_category_id IS NOT NULL
    )
  );

CREATE UNIQUE INDEX memberships_shortcut_token_hash_key
  ON app.memberships(shortcut_token_hash);

ALTER TABLE app.receipt_drafts
  DROP CONSTRAINT receipt_draft_source_valid;

ALTER TABLE app.receipt_drafts
  ADD CONSTRAINT receipt_draft_source_valid CHECK (
    source_kind IN ('fixture', 'local_ocr', 'ios_shortcut') AND
    category_type = 'expense' AND version > 0 AND
    (evidence_kind IS NULL OR evidence_kind IN ('transfer', 'qris', 'receipt', 'unknown')) AND
    (extracted_amount IS NULL OR extracted_amount > 0) AND
    (corrected_amount IS NULL OR corrected_amount > 0) AND
    (ocr_confidence IS NULL OR ocr_confidence BETWEEN 0 AND 100) AND
    (institution_confidence IS NULL OR institution_confidence BETWEEN 0 AND 100) AND
    (amount_confidence IS NULL OR amount_confidence BETWEEN 0 AND 100) AND
    (date_confidence IS NULL OR date_confidence BETWEEN 0 AND 100) AND
    (merchant_confidence IS NULL OR merchant_confidence BETWEEN 0 AND 100) AND
    (category_confidence IS NULL OR category_confidence BETWEEN 0 AND 100)
  );

COMMIT;
