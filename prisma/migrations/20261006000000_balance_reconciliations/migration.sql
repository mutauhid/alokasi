BEGIN;

CREATE TYPE "app"."ReconciliationResolution" AS ENUM ('matched', 'adjusted');

CREATE TABLE "app"."balance_reconciliations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "reconciliation_date" DATE NOT NULL,
    "recorded_balance" BIGINT NOT NULL,
    "actual_balance" BIGINT NOT NULL,
    "difference" BIGINT NOT NULL,
    "adjustment_amount" BIGINT NOT NULL DEFAULT 0,
    "resolution" "app"."ReconciliationResolution" NOT NULL,
    "note" VARCHAR(500),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_reconciliations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "balance_reconciliation_valid" CHECK (
      "request_hash" ~ '^[0-9a-f]{64}$'
      AND length(btrim("idempotency_key")) > 0
      AND "difference"::numeric = "actual_balance"::numeric - "recorded_balance"::numeric
      AND (
        ("resolution" = 'matched' AND "difference" = 0 AND "adjustment_amount" = 0)
        OR
        ("resolution" = 'adjusted' AND "difference" <> 0 AND "adjustment_amount" = "difference")
      )
    )
);

CREATE UNIQUE INDEX "balance_reconciliations_workspace_id_id_key"
    ON "app"."balance_reconciliations"("workspace_id", "id");
CREATE UNIQUE INDEX "balance_reconciliations_workspace_creator_idempotency_key"
    ON "app"."balance_reconciliations"("workspace_id", "created_by", "idempotency_key");
CREATE INDEX "balance_reconciliations_workspace_account_date_created_idx"
    ON "app"."balance_reconciliations"("workspace_id", "account_id", "reconciliation_date", "created_at");

ALTER TABLE "app"."balance_reconciliations"
    ADD CONSTRAINT "balance_reconciliations_workspace_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "balance_reconciliations_account_fkey"
      FOREIGN KEY ("workspace_id", "account_id") REFERENCES "app"."financial_accounts"("workspace_id", "id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "balance_reconciliations_creator_fkey"
      FOREIGN KEY ("workspace_id", "created_by") REFERENCES "app"."memberships"("workspace_id", "user_id")
      ON DELETE RESTRICT ON UPDATE RESTRICT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alokasi_runtime') THEN
    GRANT SELECT, INSERT, DELETE
      ON app.balance_reconciliations
      TO alokasi_runtime;
  END IF;
END
$$;

COMMIT;
