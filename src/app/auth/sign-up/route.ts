import { createSupabaseServerClient } from "@/server/auth/server";
import { reportAuthFailure, signUpErrorKey } from "@/server/auth/errors";
import { appOrigin, authRedirect, rejectCrossOrigin } from "@/server/auth/http";
import { formValue, signUpSchema } from "@/server/auth/validation";
import { provisionPersonalWorkspace } from "@/modules/workspaces/provision-personal";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const form = await request.formData();
  const input = signUpSchema.safeParse({
    displayName: formValue(form, "displayName"),
    email: formValue(form, "email"),
    password: formValue(form, "password"),
  });
  if (!input.success) return authRedirect(request, "/register?error=invalid");
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.data.email,
      password: input.data.password,
      options: {
        emailRedirectTo: `${appOrigin()}/auth/confirm`,
        data: { display_name: input.data.displayName },
      },
    });
    if (error) {
      reportAuthFailure("signup", error);
      return authRedirect(request, `/register?error=${signUpErrorKey(error)}`);
    }
    if (data.session) {
      const { data: current } = await supabase.auth.getUser();
      const user = current.user;
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
            : input.data.displayName,
      });
      return authRedirect(request, "/dashboard");
    }
    return authRedirect(request, "/verify-email?sent=1");
  } catch {
    return authRedirect(request, "/register?error=config");
  }
}
