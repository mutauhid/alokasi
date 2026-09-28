import type { Metadata } from "next";
import { AuthCard, type AuthSearchParams } from "@/components/auth-card";
export const metadata: Metadata = { title: "Masuk" };
export default function Page({
  searchParams,
}: {
  searchParams: AuthSearchParams;
}) {
  return <AuthCard mode="login" searchParams={searchParams} />;
}
