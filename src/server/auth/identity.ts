import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";

export type VerifiedIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
};

export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return null;
  const metadataName = user.user_metadata?.display_name;
  return {
    subject: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
    displayName:
      typeof metadataName === "string" && metadataName.trim()
        ? metadataName.trim().slice(0, 100)
        : null,
  };
}

export async function requireVerifiedIdentity() {
  const identity = await getVerifiedIdentity();
  if (!identity) redirect("/login");
  if (!identity.emailVerified) redirect("/verify-email");
  return identity;
}

export async function reauthenticateWithPassword(
  identity: VerifiedIdentity,
  password: string,
) {
  if (!password || password.length > 256) return false;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identity.email,
    password,
  });
  return !error && data.user?.id === identity.subject;
}
