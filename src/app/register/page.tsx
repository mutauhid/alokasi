import type { Metadata } from "next";
import { AuthCard, type AuthSearchParams } from "@/components/auth-card";
export const metadata: Metadata = { title: "Buat akun" };
export default function Page({
  searchParams,
}: {
  searchParams: AuthSearchParams;
}) {
  return <AuthCard mode="register" searchParams={searchParams} />;
}
