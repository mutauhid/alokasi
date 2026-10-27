import type { Metadata } from "next";
import {
  WorkspacePage,
  type WorkspaceSearchParams,
} from "@/components/workspace-page";

export const metadata: Metadata = { title: "Utang & Piutang" };

export default function Page({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  return <WorkspacePage section="debts" searchParams={searchParams} />;
}
