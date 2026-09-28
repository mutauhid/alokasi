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
}>;

export async function WorkspacePage({
  section,
  searchParams,
}: {
  section: Section;
  searchParams: WorkspaceSearchParams;
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
      <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-[27px] font-semibold leading-tight tracking-[-.8px]">
            {current.label}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {current.description}
          </p>
        </div>
        {showPeriod && (
          <div className="flex flex-wrap items-center gap-2">
            {periodSelection ? (
              <form
                action={`/${section}`}
                method="get"
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="hidden"
                  name="workspaceId"
                  value={context.workspace.id}
                />
                <label className="relative">
                  <span className="sr-only">Periode yang ditampilkan</span>
                  <CalendarDays
                    className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <select
                    name="periodId"
                    defaultValue={displayedPeriod.id}
                    className="min-h-10 rounded-lg border bg-card py-2 pl-9 pr-8 text-xs"
                  >
                    {periodSelection.periods.map((item) => (
                      <option key={item.id} value={item.id}>
                        {`${periodFormat.format(item.startDate)}–${periodFormat.format(
                          new Date(
                            item.endDateExclusive.valueOf() - 86_400_000,
                          ),
                        )}${item.id === activePeriod.id ? " · aktif" : ""}${item.isTransition ? " · transisi" : ""}`}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit" variant="outline" className="min-h-10">
                  Tampilkan
                </Button>
              </form>
            ) : (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-card px-3 text-xs">
                <CalendarDays
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {period}
              </span>
            )}
            {section === "dashboard" && (
              <Button asChild className="min-h-10">
                <Link href={sectionHref("transactions", context.workspace.id)}>
                  <Plus className="size-4" />
                  Tambah transaksi
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
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
        success={typeof query.success === "string" ? query.success : undefined}
        reportQuery={{
          from: typeof query.from === "string" ? query.from : undefined,
          to: typeof query.to === "string" ? query.to : undefined,
          type: typeof query.type === "string" ? query.type : undefined,
          accountId:
            typeof query.accountId === "string" ? query.accountId : undefined,
          categoryId:
            typeof query.categoryId === "string" ? query.categoryId : undefined,
          query: typeof query.query === "string" ? query.query : undefined,
        }}
        selectedPeriodId={periodSelection?.selectedPeriod.id ?? activePeriod.id}
      />
    </AppShell>
  );
}
