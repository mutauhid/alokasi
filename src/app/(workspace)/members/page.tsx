import type { Metadata } from "next";
import {
  WorkspacePage,
  type WorkspaceSearchParams,
} from "@/components/workspace-page";

export const metadata: Metadata = { title: "Anggota & akses" };

export default function Page({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  return <WorkspacePage section="members" searchParams={searchParams} />;
}
