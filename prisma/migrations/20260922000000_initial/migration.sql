-- CreateSchema
BEGIN;
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateEnum
CREATE TYPE "app"."WorkspaceType" AS ENUM ('personal', 'shared');

-- CreateEnum
CREATE TYPE "app"."MemberRole" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "app"."MemberStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "app"."TransactionType" AS ENUM ('income', 'expense', 'transfer');

-- CreateEnum
CREATE TYPE "app"."AccountType" AS ENUM ('bank', 'cash', 'ewallet');

-- CreateTable
CREATE TABLE "app"."users" (
    "id" UUID NOT NULL,
    "auth_subject" UUID,
    "email" VARCHAR(320),
    "display_name" VARCHAR(100),
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "app"."WorkspaceType" NOT NULL,
    "personal_owner_id" UUID,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'IDR',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."memberships" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "app"."MemberRole" NOT NULL,
    "status" "app"."MemberStatus" NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "invited_email" VARCHAR(320) NOT NULL,
    "role" "app"."MemberRole" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."financial_accounts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "app"."AccountType" NOT NULL,
    "opening_balance" BIGINT NOT NULL,
    "opening_date" DATE NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."categories" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "name_key" VARCHAR(100) NOT NULL,
    "type" "app"."TransactionType" NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."transactions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "type" "app"."TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "account_id" UUID NOT NULL,
    "destination_account_id" UUID,
    "category_id" UUID,
    "note" VARCHAR(1000),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."budget_periods" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date_exclusive" DATE NOT NULL,
    "cycle_setting_version" INTEGER NOT NULL DEFAULT 1,
    "is_transition" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."budgets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "category_type" "app"."TransactionType" NOT NULL DEFAULT 'expense',
    "period_id" UUID NOT NULL,
    "limit_amount" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."audit_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_id" UUID,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changed_fields" TEXT[],
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "app"."users"("auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_personal_owner_id_key" ON "app"."workspaces"("personal_owner_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "app"."memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_workspace_id_user_id_key" ON "app"."memberships"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "app"."invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_workspace_id_invited_email_idx" ON "app"."invitations"("workspace_id", "invited_email");

-- CreateIndex
CREATE INDEX "financial_accounts_workspace_id_archived_at_idx" ON "app"."financial_accounts"("workspace_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_workspace_id_id_key" ON "app"."financial_accounts"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_workspace_id_id_type_key" ON "app"."categories"("workspace_id", "id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_workspace_id_type_name_key_key" ON "app"."categories"("workspace_id", "type", "name_key");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_transaction_date_id_idx" ON "app"."transactions"("workspace_id", "transaction_date", "id");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_category_id_transaction_date_idx" ON "app"."transactions"("workspace_id", "category_id", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_account_id_transaction_date_idx" ON "app"."transactions"("workspace_id", "account_id", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_destination_account_id_transactio_idx" ON "app"."transactions"("workspace_id", "destination_account_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_workspace_id_id_key" ON "app"."transactions"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_workspace_id_created_by_idempotency_key_key" ON "app"."transactions"("workspace_id", "created_by", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "budget_periods_workspace_id_id_key" ON "app"."budget_periods"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_periods_workspace_id_start_date_key" ON "app"."budget_periods"("workspace_id", "start_date");

-- CreateIndex
CREATE INDEX "budgets_workspace_id_period_id_idx" ON "app"."budgets"("workspace_id", "period_id");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_workspace_id_category_id_period_id_key" ON "app"."budgets"("workspace_id", "category_id", "period_id");

-- CreateIndex
CREATE INDEX "audit_events_workspace_id_occurred_at_id_idx" ON "app"."audit_events"("workspace_id", "occurred_at", "id");

-- AddForeignKey
ALTER TABLE "app"."workspaces" ADD CONSTRAINT "workspaces_personal_owner_id_fkey" FOREIGN KEY ("personal_owner_id") REFERENCES "app"."users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_workspace_id_created_by_fkey" FOREIGN KEY ("workspace_id", "created_by") REFERENCES "app"."memberships"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."financial_accounts" ADD CONSTRAINT "financial_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."categories" ADD CONSTRAINT "categories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_workspace_id_created_by_fkey" FOREIGN KEY ("workspace_id", "created_by") REFERENCES "app"."memberships"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_workspace_id_updated_by_fkey" FOREIGN KEY ("workspace_id", "updated_by") REFERENCES "app"."memberships"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_workspace_id_account_id_fkey" FOREIGN KEY ("workspace_id", "account_id") REFERENCES "app"."financial_accounts"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_workspace_id_destination_account_id_fkey" FOREIGN KEY ("workspace_id", "destination_account_id") REFERENCES "app"."financial_accounts"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_workspace_id_category_id_type_fkey" FOREIGN KEY ("workspace_id", "category_id", "type") REFERENCES "app"."categories"("workspace_id", "id", "type") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."budget_periods" ADD CONSTRAINT "budget_periods_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."budgets" ADD CONSTRAINT "budgets_workspace_id_category_id_category_type_fkey" FOREIGN KEY ("workspace_id", "category_id", "category_type") REFERENCES "app"."categories"("workspace_id", "id", "type") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."budgets" ADD CONSTRAINT "budgets_workspace_id_period_id_fkey" FOREIGN KEY ("workspace_id", "period_id") REFERENCES "app"."budget_periods"("workspace_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
COMMIT;
