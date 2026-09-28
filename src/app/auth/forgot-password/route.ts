import { createSupabaseServerClient } from "@/server/auth/server";
import { appOrigin, authRedirect, rejectCrossOrigin } from "@/server/auth/http";
import { forgotPasswordSchema, formValue } from "@/server/auth/validation";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const form = await request.formData();
  const input = forgotPasswordSchema.safeParse({
    email: formValue(form, "email"),
  });
  if (input.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.resetPasswordForEmail(input.data.email, {
        redirectTo: `${appOrigin()}/auth/confirm?next=/reset-password`,
      });
    } catch {
      // Keep an enumeration-safe response for invalid accounts/config outages.
    }
  }
  return authRedirect(request, "/forgot-password?sent=1");
}
