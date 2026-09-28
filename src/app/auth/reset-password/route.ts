import { createSupabaseServerClient } from "@/server/auth/server";
import { authRedirect, rejectCrossOrigin } from "@/server/auth/http";
import { formValue, resetPasswordSchema } from "@/server/auth/validation";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const form = await request.formData();
  const input = resetPasswordSchema.safeParse({
    password: formValue(form, "password"),
  });
  if (!input.success)
    return authRedirect(request, "/reset-password?error=invalid");
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return authRedirect(request, "/login?error=session");
    const { error } = await supabase.auth.updateUser({
      password: input.data.password,
    });
    if (error) return authRedirect(request, "/reset-password?error=update");
    return authRedirect(request, "/dashboard?passwordUpdated=1");
  } catch {
    return authRedirect(request, "/reset-password?error=unavailable");
  }
}
