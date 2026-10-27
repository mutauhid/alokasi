"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createDebtPaymentInput,
  createDebtRecordInput,
  settleDebtRecordInput,
} from "@/modules/debts/domain";
import {
  createDebtPayment,
  createDebtRecord,
  settleDebtRecord,
} from "@/modules/debts/service";
import { FinanceDomainError } from "@/modules/finance/errors";
import { toDatabaseDate } from "@/modules/finance/domain";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { requireVerifiedIdentity } from "@/server/auth/identity";

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function localToday(timezone: string) {
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return toDatabaseDate(value);
}

async function access(form: FormData) {
  const identity = await requireVerifiedIdentity();
  const context = await requireWorkspaceAccess(
    identity,
    text(form, "workspaceId"),
    ["owner", "editor"],
  );
  return { ...context, today: localToday(context.timezone) };
}

const errorCodes: Record<string, string> = {
  DEBT_ACCESS_DENIED: "debt-access",
  DEBT_FUTURE_DATE: "debt-future",
  DEBT_INVALID_ORIGIN: "debt-origin",
  DEBT_ACCOUNT_INVALID: "debt-account",
  DEBT_BEFORE_ACCOUNT: "debt-before-account",
  DEBT_NOT_FOUND: "debt-not-found",
  DEBT_PAYMENT_BEFORE_START: "debt-payment-date",
  DEBT_PAYMENT_EXCEEDS_OUTSTANDING: "debt-overpayment",
  DEBT_ALREADY_SETTLED: "debt-settled",
  DEBT_IDEMPOTENCY_CONFLICT: "debt-idempotency",
};

function fail(form: FormData, code: string): never {
  const workspaceId = text(form, "workspaceId");
  redirect(
    `/debts?workspaceId=${encodeURIComponent(workspaceId)}&error=${encodeURIComponent(code)}`,
  );
}

function errorCode(error: unknown) {
  return error instanceof FinanceDomainError
    ? (errorCodes[error.code] ?? "debt-failed")
    : "debt-failed";
}

function finish(workspaceId: string, success: string): never {
  revalidatePath("/debts");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect(
    `/debts?workspaceId=${encodeURIComponent(workspaceId)}&success=${success}`,
  );
}

export async function createDebtRecordAction(form: FormData) {
  const parsed = createDebtRecordInput.safeParse({
    kind: text(form, "kind"),
    origin: text(form, "origin"),
    counterparty: text(form, "counterparty"),
    title: text(form, "title"),
    principalAmount: text(form, "principalAmount"),
    startDate: text(form, "startDate"),
    dueDate: text(form, "dueDate"),
    accountId: text(form, "accountId"),
    note: text(form, "note"),
    idempotencyKey: text(form, "idempotencyKey"),
  });
  if (!parsed.success) fail(form, "debt-invalid");
  const context = await access(form);
  try {
    await createDebtRecord(context, {
      ...parsed.data,
      startDate: toDatabaseDate(parsed.data.startDate),
      dueDate: parsed.data.dueDate ? toDatabaseDate(parsed.data.dueDate) : null,
      accountId: parsed.data.accountId || null,
    });
  } catch (error) {
    fail(form, errorCode(error));
  }
  finish(context.workspaceId, "debt-created");
}

export async function createDebtPaymentAction(form: FormData) {
  const parsed = createDebtPaymentInput.safeParse({
    debtRecordId: text(form, "debtRecordId"),
    accountId: text(form, "accountId"),
    amount: text(form, "amount"),
    paymentDate: text(form, "paymentDate"),
    note: text(form, "note"),
    idempotencyKey: text(form, "idempotencyKey"),
  });
  if (!parsed.success) fail(form, "debt-payment-invalid");
  const context = await access(form);
  try {
    await createDebtPayment(context, {
      ...parsed.data,
      paymentDate: toDatabaseDate(parsed.data.paymentDate),
    });
  } catch (error) {
    fail(form, errorCode(error));
  }
  finish(context.workspaceId, "debt-payment-created");
}

export async function settleDebtRecordAction(form: FormData) {
  const parsed = settleDebtRecordInput.safeParse({
    debtRecordId: text(form, "debtRecordId"),
    accountId: text(form, "accountId"),
    paymentDate: text(form, "paymentDate"),
    note: text(form, "note"),
    idempotencyKey: text(form, "idempotencyKey"),
  });
  if (!parsed.success) fail(form, "debt-payment-invalid");
  const context = await access(form);
  try {
    await settleDebtRecord(context, {
      ...parsed.data,
      paymentDate: toDatabaseDate(parsed.data.paymentDate),
    });
  } catch (error) {
    fail(form, errorCode(error));
  }
  finish(context.workspaceId, "debt-settled");
}
