BEGIN;

CREATE TABLE "app"."transaction_import_batches" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "source_file_name" VARCHAR(255) NOT NULL,
    "source_row_count" INTEGER NOT NULL,
    "imported_row_count" INTEGER NOT NULL,
    "skipped_row_count" INTEGER NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_import_batches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transaction_import_batches_valid" CHECK (
      "request_hash" ~ '^[0-9a-f]{64}$'
      AND length(btrim("source_file_name")) > 0
      AND length(btrim("idempotency_key")) > 0
      AND "source_row_count" > 0
      AND "imported_row_count" >= 0
      AND "skipped_row_count" >= 0
      AND "imported_row_count" + "skipped_row_count" <= "source_row_count"
    )
);

CREATE UNIQUE INDEX "transaction_import_batches_workspace_id_id_key"
    ON "app"."transaction_import_batches"("workspace_id", "id");
CREATE UNIQUE INDEX "transaction_import_batches_workspace_creator_idempotency_key"
    ON "app"."transaction_import_batches"("workspace_id", "created_by", "idempotency_key");
CREATE INDEX "transaction_import_batches_workspace_created_id_idx"
    ON "app"."transaction_import_batches"("workspace_id", "created_at", "id");

ALTER TABLE "app"."transaction_import_batches"
    ADD CONSTRAINT "transaction_import_batches_workspace_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "transaction_import_batches_account_fkey"
      FOREIGN KEY ("workspace_id", "account_id") REFERENCES "app"."financial_accounts"("workspace_id", "id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "transaction_import_batches_creator_fkey"
      FOREIGN KEY ("workspace_id", "created_by") REFERENCES "app"."memberships"("workspace_id", "user_id")
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "app"."transactions"
    ADD COLUMN "import_batch_id" UUID,
    ADD COLUMN "import_row_number" INTEGER,
    ADD CONSTRAINT "transactions_import_metadata_pair" CHECK (
      ("import_batch_id" IS NULL AND "import_row_number" IS NULL)
      OR
      ("import_batch_id" IS NOT NULL AND "import_row_number" >= 2)
    ),
    ADD CONSTRAINT "transactions_import_batch_fkey"
      FOREIGN KEY ("workspace_id", "import_batch_id") REFERENCES "app"."transaction_import_batches"("workspace_id", "id")
      ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE UNIQUE INDEX "transactions_workspace_import_batch_row_key"
    ON "app"."transactions"("workspace_id", "import_batch_id", "import_row_number");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, DELETE
      ON app.transaction_import_batches
      TO alokasi_runtime;
  END IF;
END
$$;

COMMIT;
