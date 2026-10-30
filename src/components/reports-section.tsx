import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Download,
  Repeat2,
  Scale,
  ShieldCheck,
  Tags,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  SensitiveAmount,
  SensitiveChartBar,
} from "@/components/amount-privacy";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import {
  ReportFilterControls,
  type ReportFilterValues,
} from "@/components/report-filter-controls";
import { ReportProgressiveList } from "@/components/report-progressive-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildCashFlowScale,
  scalePosition,
} from "@/components/dashboard-v2/chart-scale";
import {
  DashboardPanel,
  compactRupiah,
  rupiah,
} from "@/components/dashboard-v2/shared";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { reportComparisonPresentation } from "@/modules/reports/presentation";
import { getReportOverview, type ReportQuery } from "@/modules/reports/service";
import { cn } from "@/lib/utils";

const typeDetails = {
  income: {
    label: "Pemasukan",
    sign: "+",
    amountClass: "text-primary",
  },
  expense: {
    label: "Pengeluaran",
    sign: "−",
    amountClass: "text-destructive",
  },
  transfer: {
    label: "Transfer internal",
    sign: "",
    amountClass: "text-foreground",
  },
} as const;

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function buildCashFlowBuckets(
  transactions: Array<{
    type: "income" | "expense" | "transfer";
    amount: bigint;
    transactionDate: Date;
  }>,
  from: Date,
  toExclusive: Date,
) {
  const day = 86_400_000;
  const days = Math.max(
    1,
    Math.ceil((toExclusive.valueOf() - from.valueOf()) / day),
  );
  const bucketCount = Math.min(4, Math.max(1, Math.ceil(days / 7)));
  const range = toExclusive.valueOf() - from.valueOf();
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(
      from.valueOf() + Math.floor((range * index) / bucketCount),
    );
    const endExclusive = new Date(
      from.valueOf() + Math.floor((range * (index + 1)) / bucketCount),
    );
    return {
      income: 0n,
      expense: 0n,
      transfer: 0n,
      start,
      endExclusive,
      label: `${formatter.format(start)}–${formatter.format(new Date(endExclusive.valueOf() - day))}`,
    };
  });
  for (const transaction of transactions) {
    const offset = transaction.transactionDate.valueOf() - from.valueOf();
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((offset * bucketCount) / Math.max(1, range))),
    );
    if (transaction.type === "income") {
      buckets[index].income += transaction.amount;
    }
    if (transaction.type === "expense") {
      buckets[index].expense += transaction.amount;
    }
    if (transaction.type === "transfer") {
      buckets[index].transfer += transaction.amount;
    }
  }
  return buckets;
}

function exportHref(filters: {
  workspaceId: string;
  fromValue: string;
  toValue: string;
  type: string | null;
  accountId: string | null;
  categoryId: string | null;
  query: string | null;
}) {
  const params = new URLSearchParams({
    workspaceId: filters.workspaceId,
    from: filters.fromValue,
    to: filters.toValue,
  });
  if (filters.type) params.set("type", filters.type);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.query) params.set("query", filters.query);
  return `/api/reports/transactions.csv?${params.toString()}`;
}

function percentageTenths(value: bigint, total: bigint) {
  if (total <= 0n) return 0;
  return Number((value * 1_000n) / total) / 10;
}

function percentageLabel(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function absolute(value: bigint) {
  return value < 0n ? -value : value;
}

function percentageChangeLabel(value: bigint) {
  const magnitude = absolute(value);
  const whole = magnitude / 10n;
  const decimal = magnitude % 10n;
  return `${value > 0n ? "+" : value < 0n ? "−" : ""}${whole.toString()}${
    decimal === 0n ? "" : `,${decimal.toString()}`
  }%`;
}

function comparisonDetails(
  current: bigint,
  previous: bigint,
  positiveIsGood: boolean | null,
  mode: "standard" | "net",
) {
  const presentation = reportComparisonPresentation(current, previous, mode);
  const delta = presentation.delta;
  const isImprovement =
    positiveIsGood === null
      ? null
      : delta === 0n
        ? null
        : positiveIsGood
          ? delta > 0n
          : delta < 0n;
  return {
    presentation,
    icon: delta > 0n ? TrendingUp : delta < 0n ? TrendingDown : null,
    className:
      presentation.kind === "stable"
        ? "text-muted-foreground"
        : isImprovement === null
          ? positiveIsGood === null
            ? "text-sky-600 dark:text-sky-300"
            : "text-muted-foreground"
          : isImprovement
            ? "text-primary"
            : "text-destructive",
  };
}

function sparklinePoints(values: bigint[]) {
  const minimum = values.reduce(
    (current, value) => (value < current ? value : current),
    values[0] ?? 0n,
  );
  const maximum = values.reduce(
    (current, value) => (value > current ? value : current),
    values[0] ?? 0n,
  );
  const span = maximum - minimum;
  return values
    .map((value, index) => {
      const x = values.length <= 1 ? 60 : (index * 120) / (values.length - 1);
      const y =
        span === 0n
          ? 14
          : 25 - Number(((value - minimum) * 22_000n) / span) / 1_000;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ReportPanelHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight sm:text-[17px]">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>
    </header>
  );
}

function KpiCard({
  title,
  value,
  previousValue,
  series,
  icon: Icon,
  tone,
  positiveIsGood,
  comparisonMode = "standard",
}: {
  title: string;
  value: bigint;
  previousValue: bigint;
  series: bigint[];
  icon: LucideIcon;
  tone: "primary" | "danger" | "neutral" | "blue";
  positiveIsGood: boolean | null;
  comparisonMode?: "standard" | "net";
}) {
  const comparison = comparisonDetails(
    value,
    previousValue,
    positiveIsGood,
    comparisonMode,
  );
  const TrendIcon = comparison.icon;
  const hasSparklineHistory =
    series.length > 1 && series.some((point) => point !== 0n);
  const lineClass =
    tone === "danger"
      ? "stroke-destructive"
      : tone === "blue"
        ? "stroke-sky-500"
        : "stroke-primary";
  const accentClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "blue"
        ? "text-sky-500"
        : "text-primary";
  return (
    <div className="reports-v2-card reports-v2-kpi relative min-w-0 overflow-hidden rounded-2xl border bg-card p-4 sm:p-5">
      <div className="min-w-0 pr-9 sm:pr-11">
        <p className="min-h-8 text-[11px] font-medium leading-4 text-muted-foreground sm:text-xs">
          {title}
        </p>
        <SensitiveAmount
          className={cn(
            "reports-v2-kpi-amount mt-1.5 block text-base font-semibold tracking-[-0.035em] sm:mt-2 sm:text-xl xl:text-[1.45rem]",
            tone === "primary" && "text-primary",
            tone === "danger" && "text-destructive",
            tone === "blue" && "text-sky-600 dark:text-sky-300",
          )}
        >
          {rupiah(value)}
        </SensitiveAmount>
        <p
          className={cn(
            "mt-2 flex min-h-4 items-center gap-1 text-[9px] font-medium leading-4 sm:text-[11px]",
            comparison.className,
          )}
        >
          {TrendIcon && <TrendIcon className="size-3" aria-hidden="true" />}
          <span className="min-w-0 break-words">
            {comparison.presentation.kind === "stable" &&
              "Tetap dari periode lalu"}
            {comparison.presentation.kind === "new" &&
              "Ada nilai pada periode ini"}
            {comparison.presentation.kind === "sign-change" &&
              `Beralih menjadi ${comparison.presentation.state}`}
            {comparison.presentation.kind === "percentage" &&
              `${percentageChangeLabel(
                comparison.presentation.percentageTenths,
              )} dari periode lalu`}
            {comparison.presentation.kind === "amount" && (
              <>
                {comparison.presentation.delta > 0n ? "Naik " : "Turun "}
                <SensitiveAmount placeholder="•••">
                  {compactRupiah(absolute(comparison.presentation.delta))}
                </SensitiveAmount>{" "}
                dari periode lalu
              </>
            )}
          </span>
        </p>
        {hasSparklineHistory ? (
          <svg
            className="mt-1.5 h-7 w-full overflow-visible"
            viewBox="0 0 120 28"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={sparklinePoints(series)}
              fill="none"
              className={cn("reports-v2-sparkline", lineClass)}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <span
            className={cn(
              "reports-v2-kpi-accent mt-1.5 block h-7",
              accentClass,
            )}
            aria-hidden="true"
          />
        )}
      </div>
      <span
        className={cn(
          "absolute right-3 top-3 flex size-8 items-center justify-center rounded-xl border bg-secondary/55 sm:right-4 sm:top-4 sm:size-9",
          tone === "primary" && "border-primary/25 text-primary",
          tone === "danger" &&
            "border-destructive/25 bg-destructive/10 text-destructive",
          tone === "blue" &&
            "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
    </div>
  );
}

export async function ReportsSection({
  workspaceId,
  canExport,
  today,
  query,
}: {
  workspaceId: string;
  canExport: boolean;
  today: Date;
  query: ReportQuery;
}) {
  const report = await getReportOverview(workspaceId, today, query);
  const cashFlowBuckets = buildCashFlowBuckets(
    report.transactions,
    report.filters.from,
    report.filters.toExclusive,
  );
  const cashFlowScale = buildCashFlowScale(
    cashFlowBuckets.flatMap((bucket) => [bucket.income, bucket.expense]),
  );
  const accountLabel = report.filters.accountId
    ? report.accounts.find((account) => account.id === report.filters.accountId)
        ?.name
    : null;
  const categoryLabel = report.filters.categoryId
    ? report.categories.find(
        (category) => category.id === report.filters.categoryId,
      )?.name
    : null;
  const filterValues: ReportFilterValues = {
    from: report.filters.fromValue,
    to: report.filters.toValue,
    type: report.filters.type ?? "",
    accountId: report.filters.accountId ?? "",
    categoryId: report.filters.categoryId ?? "",
    query: report.filters.query ?? "",
  };
  const hasCustomRange =
    report.filters.fromValue !== report.defaults.from ||
    report.filters.toValue !== report.defaults.to;
  const activeFilterCount = [
    hasCustomRange,
    Boolean(report.filters.type),
    Boolean(report.filters.accountId),
    Boolean(report.filters.categoryId),
    Boolean(report.filters.query),
  ].filter(Boolean).length;
  const typeLabel = report.filters.type
    ? typeDetails[report.filters.type].label
    : "Semua jenis";
  const rangeLabel = `${displayDate(report.filters.from)}–${displayDate(
    new Date(report.filters.toExclusive.valueOf() - 86_400_000),
  )}`;
  const filterSummary = [
    `Periode: ${shortDate(report.filters.from)}–${shortDate(
      new Date(report.filters.toExclusive.valueOf() - 86_400_000),
    )}`,
    typeLabel,
    accountLabel ?? "Semua akun",
    categoryLabel ?? "Semua kategori",
    report.filters.query ? `“${report.filters.query}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const resetHref = `/reports?workspaceId=${encodeURIComponent(workspaceId)}`;
  const categoryPalette = [
    "var(--primary)",
    "#fb923c",
    "#a78bfa",
    "#38bdf8",
    "#f472b6",
    "#94a3b8",
    "#facc15",
    "#2dd4bf",
  ];
  const categorySegments = report.categoryTotals.reduce<{
    progress: number;
    items: Array<{
      name: string;
      amount: bigint;
      percent: number;
      start: number;
      end: number;
      color: string;
    }>;
  }>(
    (result, category, index) => {
      const percent = percentageTenths(category.amount, report.expense);
      const end =
        index === report.categoryTotals.length - 1
          ? 100
          : Math.min(100, result.progress + percent);
      return {
        progress: end,
        items: [
          ...result.items,
          {
            ...category,
            percent,
            start: result.progress,
            end,
            color: categoryPalette[index % categoryPalette.length],
          },
        ],
      };
    },
    { progress: 0, items: [] },
  ).items;
  const categoryChartBackground = `conic-gradient(${categorySegments
    .map((category) => `${category.color} ${category.start}% ${category.end}%`)
    .join(", ")})`;
  const csvHref = exportHref({ ...report.filters, workspaceId });

  return (
    <div className="reports-v2 space-y-4 sm:space-y-5">
      <header className="motion-page-heading flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[27px] font-semibold leading-tight tracking-[-.8px]">
            Laporan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Analisis keuangan dan pola pengeluaranmu.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-medium">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            {rangeLabel}
          </p>
        </div>
        {canExport && (
          <div className="hidden flex-col items-stretch gap-1.5 md:flex md:items-end">
            <Button asChild className="min-h-11 rounded-xl">
              <a href={csvHref} download>
                <Download aria-hidden="true" />
                Export CSV
              </a>
            </Button>
            <p className="text-[10px] text-muted-foreground">
              CSV memuat nominal asli sesuai filter.
            </p>
          </div>
        )}
      </header>

      {!report.valid && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Rentang atau filter tidak valid. Laporan dikembalikan ke periode
          workspace aktif.
        </p>
      )}

      <ReportFilterControls
        workspaceId={workspaceId}
        applied={filterValues}
        accounts={report.accounts.map((account) => ({
          id: account.id,
          label: `${account.name}${account.archivedAt ? " (arsip)" : ""}`,
        }))}
        categories={report.categories.map((category) => ({
          id: category.id,
          label: `${category.name} · ${
            category.type === "income" ? "Pemasukan" : "Pengeluaran"
          }${category.archivedAt ? " (arsip)" : ""}`,
        }))}
        activeCount={activeFilterCount}
        summary={filterSummary}
        resetHref={resetHref}
        mobileExportHref={canExport ? csvHref : undefined}
      />

      <section
        aria-label="Ringkasan finansial"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiCard
          title="Pemasukan"
          value={report.income}
          previousValue={report.comparison.income}
          series={cashFlowBuckets.map((bucket) => bucket.income)}
          icon={ArrowDownLeft}
          tone="primary"
          positiveIsGood
        />
        <KpiCard
          title="Pengeluaran"
          value={report.expense}
          previousValue={report.comparison.expense}
          series={cashFlowBuckets.map((bucket) => bucket.expense)}
          icon={ArrowUpRight}
          tone="danger"
          positiveIsGood={false}
        />
        <KpiCard
          title="Arus kas bersih"
          value={report.netCashFlow}
          previousValue={report.comparison.netCashFlow}
          series={cashFlowBuckets.map(
            (bucket) => bucket.income - bucket.expense,
          )}
          icon={Scale}
          tone={report.netCashFlow < 0n ? "danger" : "primary"}
          positiveIsGood
          comparisonMode="net"
        />
        <KpiCard
          title="Transfer internal"
          value={report.transfer}
          previousValue={report.comparison.transfer}
          series={cashFlowBuckets.map((bucket) => bucket.transfer)}
          icon={Repeat2}
          tone="blue"
          positiveIsGood={null}
        />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.85fr)]">
        <DashboardPanel className="reports-v2-card overflow-hidden">
          <ReportPanelHeading
            title="Arus kas"
            description="Perbandingan pemasukan dan pengeluaran pada rentang filter."
          />
          <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                Pengeluaran
              </span>
            </div>
            {!cashFlowScale ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center">
                <ChartNoAxesCombined
                  className="mb-3 size-7 text-primary"
                  aria-hidden="true"
                />
                <p className="font-medium">Belum ada arus kas</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  Tidak ada pemasukan atau pengeluaran pada filter ini. Transfer
                  internal tidak membentuk arus kas.
                </p>
              </div>
            ) : (
              <figure aria-label="Grafik arus kas sesuai rentang laporan">
                <div className="grid grid-cols-[2.8rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[3.4rem_minmax(0,1fr)] sm:gap-x-3">
                  <div className="relative h-52" aria-hidden="true">
                    {cashFlowScale.ticks.map((tick, index) => (
                      <span
                        key={tick.toString()}
                        className="absolute right-0 text-[9px] tabular-nums text-muted-foreground sm:text-[10px]"
                        style={{
                          bottom: `${scalePosition(tick, cashFlowScale)}%`,
                          transform:
                            index === 0
                              ? "translateY(0)"
                              : index === cashFlowScale.ticks.length - 1
                                ? "translateY(100%)"
                                : "translateY(50%)",
                        }}
                      >
                        <SensitiveAmount placeholder="•••">
                          {compactRupiah(tick)}
                        </SensitiveAmount>
                      </span>
                    ))}
                  </div>
                  <div className="relative h-52 border-b border-l">
                    {cashFlowScale.ticks.map((tick) => (
                      <span
                        key={tick.toString()}
                        className="pointer-events-none absolute inset-x-0 border-t border-border/65"
                        style={{
                          bottom: `${scalePosition(tick, cashFlowScale)}%`,
                        }}
                        aria-hidden="true"
                      />
                    ))}
                    <div
                      className="absolute inset-0 grid gap-1.5 sm:gap-3"
                      style={{
                        gridTemplateColumns: `repeat(${cashFlowBuckets.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {cashFlowBuckets.map((bucket, index) => (
                        <div
                          key={bucket.start.toISOString()}
                          className="flex min-w-0 items-end justify-center gap-1 sm:gap-2"
                        >
                          <SensitiveChartBar
                            className="dashboard-chart-bar w-3 rounded-t-sm bg-primary sm:w-5"
                            style={{
                              height: `${scalePosition(bucket.income, cashFlowScale)}%`,
                              minHeight: bucket.income > 0n ? "4px" : "0",
                              animationDelay: `${index * 70}ms`,
                            }}
                            label={`Pemasukan ${bucket.label}`}
                            value={rupiah(bucket.income)}
                          />
                          <SensitiveChartBar
                            className="dashboard-chart-bar w-3 rounded-t-sm bg-amber-500 sm:w-5"
                            style={{
                              height: `${scalePosition(bucket.expense, cashFlowScale)}%`,
                              minHeight: bucket.expense > 0n ? "4px" : "0",
                              animationDelay: `${index * 70 + 45}ms`,
                            }}
                            label={`Pengeluaran ${bucket.label}`}
                            value={rupiah(bucket.expense)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <span aria-hidden="true" />
                  <div
                    className="mt-3 grid gap-1.5 sm:gap-3"
                    style={{
                      gridTemplateColumns: `repeat(${cashFlowBuckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {cashFlowBuckets.map((bucket) => {
                      const [start, end] = bucket.label.split("–");
                      return (
                        <p
                          key={bucket.start.toISOString()}
                          className="min-w-0 text-center text-[9px] font-medium leading-4 text-muted-foreground sm:text-[11px]"
                        >
                          <span className="block sm:inline">{start}</span>
                          <span className="block sm:inline">
                            <span aria-hidden="true">–</span>
                            {end}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                </div>
                <figcaption className="sr-only">
                  Skala Rupiah menyesuaikan nilai terbesar dari data laporan.
                </figcaption>
              </figure>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="reports-v2-card overflow-hidden">
          <ReportPanelHeading
            title="Pengeluaran per kategori"
            description="Proporsi terhadap seluruh pengeluaran pada filter."
          />
          {report.categoryTotals.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 pb-6 text-center">
              <Tags className="mb-3 size-7 text-primary" aria-hidden="true" />
              <p className="font-medium">Belum ada pengeluaran</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kategori akan muncul setelah ada pengeluaran yang cocok.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[7.75rem_minmax(0,1fr)] items-center gap-4 px-4 pb-5 pt-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:px-6 sm:pb-6">
              <div
                className="reports-v2-category-chart relative aspect-square w-full rounded-full"
                style={{ background: categoryChartBackground }}
                role="img"
                aria-label={`Diagram pengeluaran per kategori: ${categorySegments
                  .map(
                    (category) =>
                      `${category.name} ${percentageLabel(category.percent)} persen`,
                  )
                  .join(", ")}`}
              >
                <div className="absolute inset-[24%] flex flex-col items-center justify-center rounded-full border bg-card text-center shadow-sm">
                  <span className="text-[9px] text-muted-foreground">
                    Total
                  </span>
                  <SensitiveAmount className="mt-0.5 max-w-full break-words px-1 text-[11px] font-semibold sm:text-xs">
                    {compactRupiah(report.expense)}
                  </SensitiveAmount>
                </div>
              </div>
              <div className="min-w-0">
                <ReportProgressiveList
                  initialCount={5}
                  step={5}
                  itemLabel="kategori"
                  className="space-y-3"
                >
                  {categorySegments.map((category) => (
                    <li
                      key={category.name}
                      className="grid grid-cols-[0.55rem_minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {category.name}
                        </p>
                        <SensitiveAmount className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {rupiah(category.amount)}
                        </SensitiveAmount>
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums">
                        {percentageLabel(category.percent)}%
                      </span>
                    </li>
                  ))}
                </ReportProgressiveList>
              </div>
            </div>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel className="reports-v2-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight sm:text-[17px]">
              Budget vs Aktual
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Perbandingan antara rencana dan realisasi budget pada periode
              aktif.
            </p>
          </div>
          <Link
            href={`/budgets?workspaceId=${encodeURIComponent(workspaceId)}`}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Lihat semua
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        {!report.isPeriodView ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-6 pb-6 text-center">
            <ShieldCheck
              className="mb-3 size-7 text-primary"
              aria-hidden="true"
            />
            <p className="font-medium">
              Budget tidak diterapkan pada filter ini
            </p>
            <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
              Budget hanya dibandingkan dengan periode workspace aktif tanpa
              filter tambahan agar realisasi tidak menyesatkan.
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link href={resetHref}>Kembali ke periode aktif</Link>
            </Button>
          </div>
        ) : report.budget.items.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-6 pb-6 text-center">
            <WalletCards
              className="mb-3 size-7 text-primary"
              aria-hidden="true"
            />
            <p className="font-medium">Belum ada budget pada periode ini</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Buat limit kategori dari halaman Budget untuk melihat
              perbandingan.
            </p>
          </div>
        ) : (
          <ul className="divide-y px-4 pb-3 pt-3 sm:px-6 sm:pb-4">
            {report.budget.items.slice(0, 3).map((item, index) => {
              const percent = budgetPercent(item.actual, item.limitAmount);
              const progress = Number(percent > 100n ? 100n : percent);
              const status = budgetStatus(item.actual, item.limitAmount);
              return (
                <li
                  key={item.id}
                  className="grid gap-2.5 py-3.5 first:pt-2 sm:grid-cols-[minmax(7rem,0.55fr)_minmax(12rem,1.25fr)_3.5rem_minmax(12rem,auto)] sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
                    <p className="truncate text-sm font-semibold">
                      {item.category.name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums sm:hidden">
                      {percent.toString()}%
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted sm:h-2"
                      role="progressbar"
                      aria-label={`${item.category.name}: ${percent.toString()} persen, status ${status}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <div
                        className={cn(
                          "dashboard-progress-fill h-full rounded-full",
                          percent > 100n
                            ? "bg-destructive"
                            : percent >= 80n
                              ? "bg-amber-500"
                              : "bg-primary",
                        )}
                        style={{
                          width: `${progress}%`,
                          animationDelay: `${120 + index * 55}ms`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="hidden text-right text-sm font-semibold tabular-nums sm:block">
                    {percent.toString()}%
                  </p>
                  <p className="min-w-0 text-right text-[11px] text-muted-foreground sm:text-xs">
                    <SensitiveAmount className="font-medium text-foreground">
                      {rupiah(item.actual)}
                    </SensitiveAmount>{" "}
                    <span aria-hidden="true">/</span>{" "}
                    <span className="sr-only">dari limit </span>
                    <SensitiveAmount>
                      {rupiah(item.limitAmount)}
                    </SensitiveAmount>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardPanel>

      <DashboardPanel className="reports-v2-card overflow-hidden">
        <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight sm:text-[17px]">
              Transaksi dalam laporan
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              {report.transactions.length} transaksi sesuai filter, diurutkan
              seperti laporan existing.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {report.transactions.length} transaksi
          </Badge>
        </div>
        {report.transactions.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 pb-6 text-center">
            <ChartNoAxesCombined
              className="mb-3 size-7 text-primary"
              aria-hidden="true"
            />
            <p className="font-medium">Tidak ada transaksi yang cocok</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ubah atau reset filter untuk melihat transaksi lain.
            </p>
          </div>
        ) : (
          <div className="pt-3 sm:pt-4">
            <div className="mx-4 hidden grid-cols-[7rem_minmax(12rem,1.5fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,auto)] gap-3 border-b px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid sm:mx-6">
              <span>Tanggal</span>
              <span>Judul</span>
              <span>Kategori</span>
              <span>Akun</span>
              <span>Jenis</span>
              <span className="text-right">Nominal</span>
            </div>
            <ReportProgressiveList
              initialCount={8}
              step={8}
              itemLabel="transaksi"
              className="divide-y px-3 sm:px-5"
            >
              {report.transactions.map((transaction) => {
                const detail = typeDetails[transaction.type];
                const accountName = transaction.destinationAccount
                  ? `${transaction.account.name} → ${transaction.destinationAccount.name}`
                  : transaction.account.name;
                const categoryName =
                  transaction.category?.name ?? "Tanpa kategori";
                return (
                  <li key={transaction.id} className="py-1.5">
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(6.5rem,auto)] items-center gap-3 rounded-xl px-1 py-3 md:hidden">
                      <TransactionCategoryIcon
                        categoryName={transaction.category?.name ?? null}
                        type={transaction.type}
                        className="size-10 rounded-xl"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {transaction.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {displayDate(transaction.transactionDate)} ·{" "}
                          {accountName} · {categoryName}
                        </p>
                        <Badge variant="outline" className="mt-1.5">
                          {detail.label}
                        </Badge>
                      </div>
                      <p
                        className={cn(
                          "min-w-0 break-words text-right text-xs font-semibold tabular-nums",
                          detail.amountClass,
                        )}
                      >
                        {detail.sign}
                        <SensitiveAmount>
                          {rupiah(transaction.amount)}
                        </SensitiveAmount>
                      </p>
                    </div>
                    <div className="hidden grid-cols-[7rem_minmax(12rem,1.5fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,auto)] items-center gap-3 rounded-xl px-2 py-3 text-sm hover:bg-muted/35 md:grid">
                      <span className="text-xs text-muted-foreground">
                        {displayDate(transaction.transactionDate)}
                      </span>
                      <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2.5">
                        <TransactionCategoryIcon
                          categoryName={transaction.category?.name ?? null}
                          type={transaction.type}
                          className="size-9 rounded-xl"
                        />
                        <span className="truncate font-medium">
                          {transaction.title}
                        </span>
                      </div>
                      <span className="truncate text-xs">{categoryName}</span>
                      <span className="truncate text-xs">{accountName}</span>
                      <Badge variant="outline" className="w-fit">
                        {detail.label}
                      </Badge>
                      <p
                        className={cn(
                          "min-w-0 break-words text-right text-xs font-semibold tabular-nums sm:text-sm",
                          detail.amountClass,
                        )}
                      >
                        {detail.sign}
                        <SensitiveAmount>
                          {rupiah(transaction.amount)}
                        </SensitiveAmount>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ReportProgressiveList>
            <p className="border-t bg-muted/15 px-4 py-3 text-[11px] text-muted-foreground sm:px-6">
              {report.transactions.length > 8
                ? `Daftar ditampilkan bertahap untuk kenyamanan. Ringkasan dan CSV tetap mencakup seluruh ${report.transactions.length} transaksi.`
                : `Seluruh ${report.transactions.length} transaksi sudah ditampilkan. Ringkasan dan CSV menggunakan hasil filter yang sama.`}
            </p>
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}
