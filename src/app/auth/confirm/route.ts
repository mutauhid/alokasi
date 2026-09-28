import { createSupabaseServerClient } from "@/server/auth/server";
import { authRedirect } from "@/server/auth/http";
import { safeNextPath } from "@/server/auth/validation";
import { provisionPersonalWorkspace } from "@/modules/workspaces/provision-personal";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const allowedTypes = new Set(["email", "signup", "recovery", "invite"]);
  const type =
    rawType && allowedTypes.has(rawType) ? (rawType as EmailOtpType) : null;
  const fallback = type === "recovery" ? "/reset-password" : "/dashboard";
  const next = safeNextPath(url.searchParams.get("next"), fallback);
  if (!code && !(tokenHash && type)) {
    return authRedirect(request, "/login?error=callback");
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
    if (error) return authRedirect(request, "/login?error=callback");
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user?.email || !user.email_confirmed_at) {
      return authRedirect(request, "/verify-email");
    }
    await provisionPersonalWorkspace({
      subject: user.id,
      email: user.email,
      emailVerified: true,
      displayName:
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null,
    });
    return authRedirect(request, next);
  } catch {
    return authRedirect(request, "/login?error=unavailable");
  }
}
