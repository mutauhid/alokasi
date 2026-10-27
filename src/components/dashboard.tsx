import { DashboardV2 } from "@/components/dashboard-v2/dashboard-v2";
import { getDashboardOverview } from "@/modules/dashboard/service";

export async function Dashboard({
  workspaceId,
  workspaceType,
  today,
  periodId,
}: {
  workspaceId: string;
  workspaceType: "personal" | "shared";
  today: Date;
  periodId: string;
}) {
  const data = await getDashboardOverview(
    workspaceId,
    today,
    periodId,
    workspaceType,
  );

  return <DashboardV2 data={data} workspaceId={workspaceId} today={today} />;
}
