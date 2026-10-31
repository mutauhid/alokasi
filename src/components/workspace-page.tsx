import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, Plus } from "lucide-react";
import { navigation, sectionHref, type Section } from "@/lib/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionContent } from "@/components/section-content";
import { Button } from "@/components/ui/button";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { getWorkspaceContext } from "@/modules/workspaces/service";
import { WorkspaceDomainError } from "@/modules/workspaces/errors";
import { ensurePeriod, getPeriodSelection } from "@/modules/periods/service";
import { parseTransactionPagination } from "@/modules/transactions/pagination";
import { ActionSuccessToast } from "@/components/action-success-toast";
import { PeriodSelect } from "@/components/period-select";

export type WorkspaceSearchParams = Promise<{
  workspaceId?: string | string[];
  error?: string | string[];
  success?: string | string[];
  from?: string | string[];
  to?: string | string[];
  type?: string | string[];
  accountId?: string | string[];
  categoryId?: string | string[];
  query?: string | string[];
  periodId?: string | string[];
  reconcileAccountId?: string | string[];
  reconcileDate?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
  search?: string | string[];
  create?: string | string[];
  scan?: string | string[];
  view?: string | string[];
}>;

export async function WorkspacePage({
  section,
  searchParams,
  transactionView = "history",
}: {
  section: Section;
  searchParams: WorkspaceSearchParams;
  transactionView?: "history" | "reminders";
}) {
  const current = navigation.find((item) => item.slug === section)!;
  const query = await searchParams;
  const identity = await requireVerifiedIdentity();
  const requestedWorkspaceId =
    typeof query.workspaceId === "string" ? query.workspaceId : undefined;
  let context;
  try {
    context = await getWorkspaceContext(identity, requestedWorkspaceId);
  } catch (error) {
    if (error instanceof WorkspaceDomainError) {
      redirect(`/${section}?error=workspace-access`);
    }
    throw error;
  }
  await connection();
  const todayValue = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: context.workspace.timezone,
  }).format(new Date());
  const today = new Date(`${todayValue}T00:00:00.000Z`);
  const activePeriod = await ensurePeriod(context.workspace.id, today);
  const requestedPeriodId =
    typeof query.periodId === "string" ? query.periodId : undefined;
  const supportsHistoricalPeriod = ["dashboard", "budgets"].includes(section);
  const periodSelection = supportsHistoricalPeriod
    ? await getPeriodSelection(context.workspace.id, today, requestedPeriodId)
    : null;
  const displayedPeriod = periodSelection?.selectedPeriod ?? activePeriod;
  const periodFormat = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const period = `${periodFormat.format(displayedPeriod.startDate)}–${periodFormat.format(
    new Date(displayedPeriod.endDateExclusive.valueOf() - 86_400_000),
  )}${displayedPeriod.isTransition ? " · transisi" : ""}`;
  const showPeriod = [
    "dashboard",
    "transactions",
    "budgets",
    "reports",
  ].includes(section);
  const success = typeof query.success === "string" ? query.success : undefined;

  return (
    <AppShell
      section={section}
      workspace={{
        id: context.workspace.id,
        name: context.workspace.name,
        type: context.workspace.type,
        role: context.membership.role,
      }}
      workspaces={context.workspaces}
      userLabel={context.user.displayName ?? identity.email}
      userEmail={identity.email}
    >
      <ActionSuccessToast code={success} />
      <div className="workspace-page-motion">
        {section !== "budgets" && section !== "reports" && (
          <div
            className={`motion-page-heading mb-7 flex flex-wrap items-start justify-between gap-5 ${section === "dashboard" ? "dashboard-v2-heading" : ""}`}
          >
            <div
              className={
                section === "dashboard"
                  ? "dashboard-v2-heading-copy"
                  : undefined
              }
            >
              {section === "dashboard" && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {context.workspace.type === "personal"
                    ? "Workspace pribadi"
                    : context.workspace.name}
                </p>
              )}
              <h1 className="text-[25px] font-semibold leading-tight tracking-[-.8px] sm:text-[27px]">
                {section === "dashboard"
                  ? "Selamat datang kembali 👋"
                  : current.label}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {section === "dashboard"
                  ? "Kelola keuanganmu, capai tujuan finansial lebih mudah dalam satu tempat."
                  : current.description}
              </p>
            </div>
            {showPeriod && (
              <div
                className={`flex flex-wrap items-center gap-2 ${section === "dashboard" ? "dashboard-v2-heading-actions" : ""}`}
              >
                {periodSelection ? (
                  <form
                    action={`/${section}`}
                    method="get"
                    className={`flex flex-wrap items-center gap-2 ${section === "dashboard" ? "dashboard-v2-period-form" : ""}`}
                  >
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={context.workspace.id}
                    />
                    <div
                      className={
                        section === "dashboard"
                          ? "dashboard-v2-period-control"
                          : undefined
                      }
                    >
                      <PeriodSelect
                        name="periodId"
                        defaultValue={displayedPeriod.id}
                        ariaLabel="Periode yang ditampilkan"
                        options={periodSelection.periods.map((item) => ({
                          value: item.id,
                          label: `${periodFormat.format(item.startDate)}–${periodFormat.format(
                            new Date(
                              item.endDateExclusive.valueOf() - 86_400_000,
                            ),
                          )}${item.id === activePeriod.id ? " · aktif" : ""}${item.isTransition ? " · transisi" : ""}`,
                        }))}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      className={`min-h-11 rounded-xl ${section === "dashboard" ? "dashboard-v2-period-submit" : ""}`}
                    >
                      Tampilkan
                    </Button>
                  </form>
                ) : (
                  <span
                    className="inline-flex min-h-10 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border bg-card px-3 text-xs"
                    aria-label={
                      section === "transactions"
                        ? `Periode workspace ${period}`
                        : period
                    }
                  >
                    <CalendarDays
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {section === "transactions" && (
                      <span className="font-medium text-muted-foreground">
                        Periode workspace
                      </span>
                    )}
                    <span>{period}</span>
                  </span>
                )}
                {section === "dashboard" && (
                  <Button
                    asChild
                    className="dashboard-v2-create-action min-h-11 rounded-xl"
                  >
                    <Link
                      href={`${sectionHref("transactions", context.workspace.id)}&create=1`}
                    >
                      <Plus className="size-4" />
                      Catat transaksi
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        <SectionContent
          section={section}
          access={{
            workspaceId: context.workspace.id,
            actorId: context.user.id,
            role: context.membership.role,
            timezone: context.workspace.timezone,
            workspaceType: context.workspace.type,
          }}
          today={today}
          error={typeof query.error === "string" ? query.error : undefined}
          reportQuery={{
            from: typeof query.from === "string" ? query.from : undefined,
            to: typeof query.to === "string" ? query.to : undefined,
            type: typeof query.type === "string" ? query.type : undefined,
            accountId:
              typeof query.accountId === "string" ? query.accountId : undefined,
            categoryId:
              typeof query.categoryId === "string"
                ? query.categoryId
                : undefined,
            query: typeof query.query === "string" ? query.query : undefined,
          }}
          selectedPeriodId={
            periodSelection?.selectedPeriod.id ?? activePeriod.id
          }
          reconcileAccountId={
            typeof query.reconcileAccountId === "string"
              ? query.reconcileAccountId
              : undefined
          }
          reconcileDate={
            typeof query.reconcileDate === "string"
              ? query.reconcileDate
              : undefined
          }
          transactionView={transactionView}
          transactionPagination={parseTransactionPagination(query)}
          openCreateTransaction={query.create === "1"}
          openReceiptScan={query.scan === "1"}
          settingsView={typeof query.view === "string" ? query.view : undefined}
        />
      </div>
    </AppShell>
  );
}
