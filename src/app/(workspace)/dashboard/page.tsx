import type { Metadata } from "next";
import {
  WorkspacePage,
  type WorkspaceSearchParams,
} from "@/components/workspace-page";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  return <WorkspacePage section="dashboard" searchParams={searchParams} />;
}
