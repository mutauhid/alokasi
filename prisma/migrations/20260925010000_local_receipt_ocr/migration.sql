BEGIN;

ALTER TABLE app.receipt_drafts
  ADD COLUMN detected_institution varchar(100),
  ADD COLUMN evidence_kind varchar(20),
  ADD COLUMN payment_rail varchar(50),
  ADD COLUMN ocr_confidence smallint,
  ADD COLUMN institution_confidence smallint;

ALTER TABLE app.receipt_drafts
  DROP CONSTRAINT receipt_draft_fixture_valid;

ALTER TABLE app.receipt_drafts
  ADD CONSTRAINT receipt_draft_source_valid CHECK (
    source_kind IN ('fixture', 'local_ocr') AND
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
