BEGIN;

ALTER TABLE app.receipt_drafts
  ADD COLUMN evidence_image bytea,
  ADD COLUMN evidence_image_mime varchar(50),
  ADD COLUMN evidence_image_expires_at timestamptz(3),
  ADD COLUMN corrected_title varchar(100),
  ADD CONSTRAINT receipt_draft_evidence_image_valid CHECK (
    (
      evidence_image IS NULL
      AND evidence_image_mime IS NULL
      AND evidence_image_expires_at IS NULL
    )
    OR
    (
      evidence_image IS NOT NULL
      AND octet_length(evidence_image) BETWEEN 1 AND 4194304
      AND evidence_image_mime IN ('image/jpeg', 'image/png', 'image/webp')
      AND evidence_image_expires_at IS NOT NULL
      AND evidence_image_expires_at > created_at
    )
  );

COMMIT;
