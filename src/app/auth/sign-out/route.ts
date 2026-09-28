import { createSupabaseServerClient } from "@/server/auth/server";
import { authRedirect, rejectCrossOrigin } from "@/server/auth/http";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Redirect to login even if the provider is unavailable.
  }
  return authRedirect(request, "/login?signedOut=1");
}
