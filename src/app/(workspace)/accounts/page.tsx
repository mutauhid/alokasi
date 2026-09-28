import type { Metadata } from "next";
import {
  WorkspacePage,
  type WorkspaceSearchParams,
} from "@/components/workspace-page";

export const metadata: Metadata = { title: "Akun" };

export default function Page({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  return <WorkspacePage section="accounts" searchParams={searchParams} />;
}
