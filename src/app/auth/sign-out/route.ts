import { createSupabaseServerClient } from "@/server/auth/server";
import { authRedirect, rejectCrossOrigin } from "@/server/auth/http";
import { getVerifiedIdentity } from "@/server/auth/identity";
import { getDatabase } from "@/server/db/client";
import { revokeWebPushSubscription } from "@/modules/web-push/service";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  try {
    try {
      const [identity, form] = await Promise.all([
        getVerifiedIdentity(),
        request.formData(),
      ]);
      const pushEndpoint = form.get("pushEndpoint");
      if (identity && typeof pushEndpoint === "string" && pushEndpoint) {
        const user = await getDatabase().user.findUnique({
          where: { authSubject: identity.subject },
          select: { id: true },
        });
        if (user) await revokeWebPushSubscription(user.id, pushEndpoint);
      }
    } catch {
      // Signing out remains available if device-subscription cleanup is offline.
    }
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Redirect to login even if the provider is unavailable.
  }
  return authRedirect(request, "/login?signedOut=1");
}
