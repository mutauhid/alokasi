import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { acceptInvitationAction } from "@/app/(workspace)/workspace-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationPreview } from "@/modules/workspaces/service";
import { getVerifiedIdentity } from "@/server/auth/identity";

export const metadata: Metadata = { title: "Undangan ruang" };

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const identity = await getVerifiedIdentity();
  if (!identity) {
    redirect(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
  }
  if (!identity.emailVerified) redirect("/verify-email");
  const { error } = await searchParams;
  const invitation = await getInvitationPreview(token);
  if (!invitation) redirect("/dashboard");
  const unavailable =
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= new Date();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4 py-10">
      <Card className="w-full shadow-none">
        <CardHeader>
          <CardTitle>Undangan ruang bersama</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kamu diundang sebagai{" "}
            {invitation.role === "editor" ? "Editor" : "Viewer"} di ruang{" "}
            {invitation.workspace.name}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "email-mismatch" && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              Masuk dengan email terverifikasi yang tercantum pada undangan.
            </p>
          )}
          {error === "invalid" && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              Undangan sudah dipakai, dicabut, atau kedaluwarsa.
            </p>
          )}
          {unavailable ? (
            <p className="rounded-lg bg-muted p-3 text-sm">
              Undangan ini tidak lagi tersedia.
            </p>
          ) : (
            <form action={acceptInvitationAction}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="w-full">
                Terima dan buka ruang
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
