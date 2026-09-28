import { createSupabaseServerClient } from "@/server/auth/server";
import { authRedirect, rejectCrossOrigin } from "@/server/auth/http";
import {
  formValue,
  safeNextPath,
  signInSchema,
} from "@/server/auth/validation";
import { provisionPersonalWorkspace } from "@/modules/workspaces/provision-personal";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const form = await request.formData();
  const next = safeNextPath(formValue(form, "next"));
  const input = signInSchema.safeParse({
    email: formValue(form, "email"),
    password: formValue(form, "password"),
  });
  if (!input.success) return authRedirect(request, "/login?error=invalid");
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(input.data);
    if (error || !data.user?.email)
      return authRedirect(request, "/login?error=credentials");
    if (!data.user.email_confirmed_at)
      return authRedirect(request, "/verify-email");
    await provisionPersonalWorkspace({
      subject: data.user.id,
      email: data.user.email,
      emailVerified: true,
      displayName:
        typeof data.user.user_metadata?.display_name === "string"
          ? data.user.user_metadata.display_name
          : null,
    });
    return authRedirect(request, next);
  } catch {
    return authRedirect(request, "/login?error=unavailable");
  }
}
