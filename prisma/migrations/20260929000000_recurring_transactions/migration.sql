BEGIN;

CREATE TABLE "app"."recurring_transaction_templates" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "app"."TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "note" VARCHAR(1000),
    "recurrence_day" SMALLINT NOT NULL,
    "next_due_date" DATE NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recurring_transaction_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_template_type_check" CHECK ("type" IN ('income', 'expense')),
    CONSTRAINT "recurring_template_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "recurring_template_day_check" CHECK ("recurrence_day" BETWEEN 1 AND 31)
);

ALTER TABLE "app"."transactions"
    ADD COLUMN "recurring_template_id" UUID,
    ADD COLUMN "recurring_due_date" DATE,
    ADD CONSTRAINT "transaction_recurring_shape_check" CHECK (
      ("recurring_template_id" IS NULL AND "recurring_due_date" IS NULL)
      OR
      ("recurring_template_id" IS NOT NULL AND "recurring_due_date" IS NOT NULL)
    );

CREATE UNIQUE INDEX "recurring_transaction_templates_workspace_id_id_key"
    ON "app"."recurring_transaction_templates"("workspace_id", "id");
CREATE INDEX "recurring_templates_workspace_archived_due_idx"
    ON "app"."recurring_transaction_templates"("workspace_id", "archived_at", "next_due_date");
CREATE INDEX "recurring_templates_workspace_account_archived_idx"
    ON "app"."recurring_transaction_templates"("workspace_id", "account_id", "archived_at");
CREATE INDEX "recurring_templates_workspace_category_archived_idx"
    ON "app"."recurring_transaction_templates"("workspace_id", "category_id", "archived_at");
CREATE UNIQUE INDEX "transactions_workspace_recurring_due_key"
    ON "app"."transactions"("workspace_id", "recurring_template_id", "recurring_due_date");

ALTER TABLE "app"."recurring_transaction_templates"
    ADD CONSTRAINT "recurring_templates_workspace_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "recurring_templates_creator_fkey"
      FOREIGN KEY ("workspace_id", "created_by") REFERENCES "app"."memberships"("workspace_id", "user_id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "recurring_templates_account_fkey"
      FOREIGN KEY ("workspace_id", "account_id") REFERENCES "app"."financial_accounts"("workspace_id", "id")
      ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT "recurring_templates_category_fkey"
      FOREIGN KEY ("workspace_id", "category_id", "type") REFERENCES "app"."categories"("workspace_id", "id", "type")
      ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "app"."transactions"
    ADD CONSTRAINT "transactions_recurring_template_fkey"
      FOREIGN KEY ("workspace_id", "recurring_template_id") REFERENCES "app"."recurring_transaction_templates"("workspace_id", "id")
      ON DELETE RESTRICT ON UPDATE RESTRICT;

COMMIT;
