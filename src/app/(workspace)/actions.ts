"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveAccount,
  createAccount,
  renameAccount,
} from "@/modules/accounts/service";
import {
  archiveCategory,
  createCategory,
  renameCategory,
  restoreCategory,
} from "@/modules/categories/service";
import {
  copyBudgetsInput,
  createBudgetInput,
  createAccountInput,
  createCategoryInput,
  createTransactionInput,
  renameCategoryInput,
  renameInput,
  toDatabaseDate,
  updateTransactionInput,
  updateBudgetInput,
  versionedInput,
} from "@/modules/finance/domain";
import { changeCycleInput } from "@/modules/periods/domain";
import { changeCycleStartDay } from "@/modules/periods/service";
import { FinanceDomainError } from "@/modules/finance/errors";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/modules/transactions/service";
import {
  copyBudgetsFromPrevious,
  createBudget,
  deleteBudget,
  updateBudget,
} from "@/modules/budgets/service";
import {
  cancelReceiptDraft,
  createLocalReceiptDraft,
  createSimulatedReceiptDraft,
  submitReceiptDraft,
} from "@/modules/receipts/service";
import {
  cancelReceiptDraftInput,
  createLocalReceiptDraftInput,
  submitReceiptDraftInput,
} from "@/modules/receipts/domain";
import type { ReceiptDraftFormState } from "@/modules/receipts/form-state";

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

async function mutationContext(
  form: FormData,
  roles: Array<"owner" | "editor" | "viewer">,
) {
  const identity = await requireVerifiedIdentity();
  const context = await requireWorkspaceAccess(
    identity,
    text(form, "workspaceId"),
    roles,
  );
  return {
    ...context,
    today: toDatabaseDate(localToday(context.timezone)),
  };
}

function localToday(timeZone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const accountErrors: Record<string, string> = {
  ACCOUNT_CONFLICT: "account-conflict",
  ACCOUNT_NOT_ZERO: "account-not-zero",
};

const categoryErrors: Record<string, string> = {
  CATEGORY_CONFLICT: "category-conflict",
  CATEGORY_DUPLICATE: "category-duplicate",
  CATEGORY_ARCHIVED: "category-name-archived",
};

function domainErrorPath(
  error: unknown,
  area: "accounts" | "settings",
  fallback: string,
) {
  if (!(error instanceof FinanceDomainError)) return fallback;
  const key =
    area === "accounts"
      ? accountErrors[error.code]
      : categoryErrors[error.code];
  return key ?? fallback;
}

function finish(
  path: "/accounts" | "/settings" | "/transactions" | "/budgets",
  message: string,
  workspaceId: string,
): never {
  revalidatePath(path);
  redirect(`${path}?workspaceId=${workspaceId}&success=${message}`);
}

function fail(
  path: "/accounts" | "/settings" | "/transactions" | "/budgets",
  form: FormData,
  message: string,
): never {
  const workspaceId = text(form, "workspaceId");
  redirect(
    `${path}?${workspaceId ? `workspaceId=${encodeURIComponent(workspaceId)}&` : ""}error=${message}`,
  );
}

export async function createAccountAction(form: FormData) {
  const input = createAccountInput.safeParse({
    name: text(form, "name"),
    type: text(form, "type"),
    openingBalance: text(form, "openingBalance"),
    openingDate: text(form, "openingDate"),
  });
  if (!input.success) {
    fail("/accounts", form, "account-invalid");
  }
  const context = await mutationContext(form, ["owner"]);
  if (input.data.openingDate > localToday(context.timezone)) {
    fail("/accounts", form, "account-invalid");
  }
  try {
    await createAccount(context, {
      ...input.data,
      openingDate: toDatabaseDate(input.data.openingDate),
    });
  } catch (error) {
    fail(
      "/accounts",
      form,
      domainErrorPath(error, "accounts", "account-failed"),
    );
  }
  finish("/accounts", "account-created", context.workspaceId);
}

export async function renameAccountAction(form: FormData) {
  const input = renameInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
    name: text(form, "name"),
  });
  if (!input.success) fail("/accounts", form, "account-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await renameAccount(context, input.data);
  } catch (error) {
    fail(
      "/accounts",
      form,
      domainErrorPath(error, "accounts", "account-failed"),
    );
  }
  finish("/accounts", "account-renamed", context.workspaceId);
}

export async function archiveAccountAction(form: FormData) {
  const input = versionedInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
  });
  if (!input.success) fail("/accounts", form, "account-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await archiveAccount(context, input.data);
  } catch (error) {
    fail(
      "/accounts",
      form,
      domainErrorPath(error, "accounts", "account-failed"),
    );
  }
  finish("/accounts", "account-archived", context.workspaceId);
}

export async function createCategoryAction(form: FormData) {
  const input = createCategoryInput.safeParse({
    name: text(form, "name"),
    type: text(form, "type"),
  });
  if (!input.success) fail("/settings", form, "category-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await createCategory(context, input.data);
  } catch (error) {
    fail(
      "/settings",
      form,
      domainErrorPath(error, "settings", "category-failed"),
    );
  }
  finish("/settings", "category-created", context.workspaceId);
}

export async function renameCategoryAction(form: FormData) {
  const input = renameCategoryInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
    name: text(form, "name"),
  });
  if (!input.success) fail("/settings", form, "category-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await renameCategory(context, input.data);
  } catch (error) {
    fail(
      "/settings",
      form,
      domainErrorPath(error, "settings", "category-failed"),
    );
  }
  finish("/settings", "category-renamed", context.workspaceId);
}

async function changeCategoryArchive(form: FormData, restore: boolean) {
  const input = versionedInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
  });
  if (!input.success) fail("/settings", form, "category-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    if (restore) await restoreCategory(context, input.data);
    else await archiveCategory(context, input.data);
  } catch (error) {
    fail(
      "/settings",
      form,
      domainErrorPath(error, "settings", "category-failed"),
    );
  }
  finish(
    "/settings",
    restore ? "category-restored" : "category-archived",
    context.workspaceId,
  );
}

export async function archiveCategoryAction(form: FormData) {
  return changeCategoryArchive(form, false);
}

export async function restoreCategoryAction(form: FormData) {
  return changeCategoryArchive(form, true);
}

const transactionErrors: Record<string, string> = {
  TRANSACTION_FUTURE_DATE: "transaction-future",
  TRANSACTION_INVALID_SHAPE: "transaction-shape",
  TRANSACTION_ACCOUNT_INVALID: "transaction-account",
  TRANSACTION_BEFORE_ACCOUNT: "transaction-before-account",
  TRANSACTION_CATEGORY_INVALID: "transaction-category",
  TRANSACTION_IDEMPOTENCY_CONFLICT: "transaction-idempotency",
  TRANSACTION_CONFLICT: "transaction-conflict",
};

function transactionError(error: unknown) {
  return error instanceof FinanceDomainError
    ? (transactionErrors[error.code] ?? "transaction-failed")
    : "transaction-failed";
}

function transactionFields(form: FormData) {
  return {
    type: text(form, "type"),
    amount: text(form, "amount"),
    transactionDate: text(form, "transactionDate"),
    accountId: text(form, "accountId"),
    destinationAccountId: text(form, "destinationAccountId"),
    categoryId: text(form, "categoryId"),
    note: text(form, "note"),
  };
}

function serviceTransactionInput(input: {
  type: "income" | "expense" | "transfer";
  amount: bigint;
  transactionDate: string;
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
  note: string | null;
}) {
  return {
    ...input,
    transactionDate: toDatabaseDate(input.transactionDate),
    destinationAccountId:
      input.type === "transfer" ? input.destinationAccountId || null : null,
    categoryId: input.type === "transfer" ? null : input.categoryId || null,
  };
}

export async function createTransactionAction(form: FormData) {
  const input = createTransactionInput.safeParse({
    ...transactionFields(form),
    idempotencyKey: text(form, "idempotencyKey"),
  });
  if (!input.success) fail("/transactions", form, "transaction-invalid");
  const context = await mutationContext(form, ["owner", "editor"]);
  try {
    await createTransaction(context, {
      ...serviceTransactionInput(input.data),
      idempotencyKey: input.data.idempotencyKey,
    });
  } catch (error) {
    fail("/transactions", form, transactionError(error));
  }
  finish("/transactions", "transaction-created", context.workspaceId);
}

export async function updateTransactionAction(form: FormData) {
  const input = updateTransactionInput.safeParse({
    ...transactionFields(form),
    id: text(form, "id"),
    version: text(form, "version"),
  });
  if (!input.success) fail("/transactions", form, "transaction-invalid");
  const context = await mutationContext(form, ["owner", "editor"]);
  try {
    await updateTransaction(context, {
      ...serviceTransactionInput(input.data),
      id: input.data.id,
      version: input.data.version,
    });
  } catch (error) {
    fail("/transactions", form, transactionError(error));
  }
  finish("/transactions", "transaction-updated", context.workspaceId);
}

export async function deleteTransactionAction(form: FormData) {
  const input = versionedInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
  });
  if (!input.success) fail("/transactions", form, "transaction-invalid");
  const context = await mutationContext(form, ["owner", "editor"]);
  try {
    await deleteTransaction(context, input.data);
  } catch (error) {
    fail("/transactions", form, transactionError(error));
  }
  finish("/transactions", "transaction-deleted", context.workspaceId);
}

const receiptErrors: Record<string, string> = {
  RECEIPT_ACCESS_DENIED: "Kamu tidak memiliki izin untuk mengelola draf ini.",
  RECEIPT_CATEGORY_REQUIRED:
    "Tambahkan kategori pengeluaran aktif sebelum membuat draf.",
  RECEIPT_CONFLICT:
    "Draf sudah berubah, dibatalkan, atau telah disubmit. Muat ulang halaman.",
  TRANSACTION_FUTURE_DATE: "Tanggal transaksi tidak boleh di masa depan.",
  TRANSACTION_ACCOUNT_INVALID: "Pilih akun aktif dalam ruang ini.",
  TRANSACTION_BEFORE_ACCOUNT:
    "Tanggal transaksi mendahului tanggal mulai akun.",
  TRANSACTION_CATEGORY_INVALID:
    "Pilih kategori pengeluaran aktif dalam ruang ini.",
};

function receiptError(error: unknown) {
  return error instanceof FinanceDomainError
    ? (receiptErrors[error.code] ?? "Draf belum dapat diproses.")
    : "Draf belum dapat diproses.";
}

function receiptDraftView(draft: {
  id: string;
  version: number;
  sourceKind: string;
  extractedAmount: bigint | null;
  extractedTransactionDate: Date | null;
  extractedMerchant: string | null;
  extractedNote: string | null;
  detectedInstitution: string | null;
  evidenceKind: string | null;
  paymentRail: string | null;
  ocrConfidence: number | null;
  institutionConfidence: number | null;
  suggestedCategoryId: string | null;
  amountConfidence: number | null;
  dateConfidence: number | null;
  merchantConfidence: number | null;
  categoryConfidence: number | null;
}): ReceiptDraftFormState {
  const evidenceKind = ["transfer", "qris", "receipt"].includes(
    draft.evidenceKind ?? "",
  )
    ? (draft.evidenceKind as "transfer" | "qris" | "receipt")
    : "unknown";
  return {
    phase: "review",
    draft: {
      id: draft.id,
      version: draft.version,
      sourceKind: draft.sourceKind === "local_ocr" ? "local_ocr" : "fixture",
      amount: draft.extractedAmount?.toString() ?? "",
      transactionDate:
        draft.extractedTransactionDate?.toISOString().slice(0, 10) ?? "",
      merchant: draft.extractedMerchant ?? "",
      note: draft.extractedNote ?? "",
      categoryId: draft.suggestedCategoryId ?? "",
      detection: {
        institution: draft.detectedInstitution ?? "",
        evidenceKind,
        paymentRail: draft.paymentRail ?? "",
        ocr: draft.ocrConfidence,
        institutionConfidence: draft.institutionConfidence,
      },
      confidence: {
        amount: draft.amountConfidence,
        date: draft.dateConfidence,
        merchant: draft.merchantConfidence,
        category: draft.categoryConfidence,
      },
    },
  };
}

export async function receiptDraftAction(
  previous: ReceiptDraftFormState,
  form: FormData,
): Promise<ReceiptDraftFormState> {
  const intent = text(form, "intent");
  const context = await mutationContext(form, ["owner", "editor"]);

  if (intent === "extract") {
    const parsed = createLocalReceiptDraftInput.safeParse({
      amount: text(form, "amount"),
      transactionDate: text(form, "transactionDate"),
      merchant: text(form, "merchant"),
      note: text(form, "note"),
      institution: text(form, "institution"),
      evidenceKind: text(form, "evidenceKind"),
      paymentRail: text(form, "paymentRail"),
      ocrConfidence: text(form, "ocrConfidence"),
      amountConfidence: text(form, "amountConfidence"),
      dateConfidence: text(form, "dateConfidence"),
      merchantConfidence: text(form, "merchantConfidence"),
      institutionConfidence: text(form, "institutionConfidence"),
    });
    if (!parsed.success) {
      return {
        phase: "idle",
        error: "Hasil OCR lokal tidak valid. Gunakan input transaksi manual.",
      };
    }
    try {
      const draft = await createLocalReceiptDraft(context, parsed.data);
      return receiptDraftView(draft);
    } catch (error) {
      return { phase: "idle", error: receiptError(error) };
    }
  }

  if (intent === "simulate") {
    try {
      const draft = await createSimulatedReceiptDraft(context);
      return receiptDraftView(draft);
    } catch (error) {
      return { phase: "idle", error: receiptError(error) };
    }
  }

  if (intent === "cancel") {
    const parsed = cancelReceiptDraftInput.safeParse({
      draftId: text(form, "draftId"),
      version: text(form, "version"),
    });
    if (!parsed.success) return { ...previous, error: "Draf tidak valid." };
    try {
      await cancelReceiptDraft(context, parsed.data);
      return {
        phase: "idle",
        message: "Draf dibatalkan. Tidak ada transaksi yang dibuat.",
      };
    } catch (error) {
      return { ...previous, error: receiptError(error) };
    }
  }

  if (intent !== "submit") {
    return { ...previous, error: "Tindakan draf tidak dikenali." };
  }
  const parsed = submitReceiptDraftInput.safeParse({
    draftId: text(form, "draftId"),
    version: text(form, "version"),
    amount: text(form, "amount"),
    transactionDate: text(form, "transactionDate"),
    merchant: text(form, "merchant"),
    note: text(form, "note"),
    accountId: text(form, "accountId"),
    categoryId: text(form, "categoryId"),
  });
  if (!parsed.success) {
    return {
      ...previous,
      error: "Periksa nominal, tanggal, akun, kategori, dan catatan.",
    };
  }
  try {
    await submitReceiptDraft(context, parsed.data);
  } catch (error) {
    return { ...previous, error: receiptError(error) };
  }
  finish("/transactions", "receipt-submitted", context.workspaceId);
}

const budgetErrors: Record<string, string> = {
  BUDGET_CATEGORY_INVALID: "budget-category",
  BUDGET_DUPLICATE: "budget-duplicate",
  BUDGET_CONFLICT: "budget-conflict",
  BUDGET_COPY_CONFLICT: "budget-copy-conflict",
  BUDGET_COPY_SOURCE_INVALID: "budget-copy-source",
  BUDGET_COPY_TARGET_INVALID: "budget-copy-target",
  PERIOD_NOT_AVAILABLE: "budget-period",
};

function budgetError(error: unknown) {
  return error instanceof FinanceDomainError
    ? (budgetErrors[error.code] ?? "budget-failed")
    : "budget-failed";
}

export async function createBudgetAction(form: FormData) {
  const input = createBudgetInput.safeParse({
    categoryId: text(form, "categoryId"),
    limitAmount: text(form, "limitAmount"),
  });
  if (!input.success) fail("/budgets", form, "budget-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await createBudget(context, input.data);
  } catch (error) {
    fail("/budgets", form, budgetError(error));
  }
  finish("/budgets", "budget-created", context.workspaceId);
}

export async function copyBudgetsAction(form: FormData) {
  const input = copyBudgetsInput.safeParse({
    sourcePeriodId: text(form, "sourcePeriodId"),
    targetPeriodId: text(form, "targetPeriodId"),
    categoryIds: form
      .getAll("categoryIds")
      .filter((value): value is string => typeof value === "string"),
  });
  if (!input.success) fail("/budgets", form, "budget-copy-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await copyBudgetsFromPrevious(context, input.data);
  } catch (error) {
    fail("/budgets", form, budgetError(error));
  }
  finish("/budgets", "budget-copied", context.workspaceId);
}

export async function updateBudgetAction(form: FormData) {
  const input = updateBudgetInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
    limitAmount: text(form, "limitAmount"),
  });
  if (!input.success) fail("/budgets", form, "budget-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await updateBudget(context, input.data);
  } catch (error) {
    fail("/budgets", form, budgetError(error));
  }
  finish("/budgets", "budget-updated", context.workspaceId);
}

export async function deleteBudgetAction(form: FormData) {
  const input = versionedInput.safeParse({
    id: text(form, "id"),
    version: text(form, "version"),
  });
  if (!input.success) fail("/budgets", form, "budget-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await deleteBudget(context, input.data);
  } catch (error) {
    fail("/budgets", form, budgetError(error));
  }
  finish("/budgets", "budget-deleted", context.workspaceId);
}

export async function changeCycleStartDayAction(form: FormData) {
  const input = changeCycleInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    startDay: text(form, "startDay"),
    version: text(form, "version"),
  });
  if (!input.success) fail("/settings", form, "cycle-invalid");
  const context = await mutationContext(form, ["owner"]);
  try {
    await changeCycleStartDay(context, input.data);
  } catch (error) {
    const message =
      error instanceof FinanceDomainError &&
      ["CYCLE_FUTURE_BUDGETS", "CYCLE_CONFLICT"].includes(error.code)
        ? "cycle-future-conflict"
        : "cycle-failed";
    fail("/settings", form, message);
  }
  finish("/settings", "cycle-updated", context.workspaceId);
}
