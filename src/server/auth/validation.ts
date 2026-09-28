import { z } from "zod";

const email = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((v) => v.toLowerCase());
const password = z.string().min(8).max(128);

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  email,
  password,
});
export const signInSchema = z.object({ email, password });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ password });

export function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function safeNextPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  return value;
}

export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const submitted = new URL(origin);
    const requestUrl = new URL(request.url);
    const configured = process.env.APP_URL
      ? new URL(process.env.APP_URL)
      : null;

    if (
      submitted.origin === requestUrl.origin ||
      submitted.origin === configured?.origin
    ) {
      return true;
    }

    // Next.js development can normalize localhost to 127.0.0.1 internally.
    // Treat only those two loopback names as equivalent, with the same scheme
    // and port. This keeps the production same-origin rule exact.
    const loopbackNames = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return Boolean(
      configured &&
      loopbackNames.has(submitted.hostname) &&
      loopbackNames.has(configured.hostname) &&
      submitted.protocol === configured.protocol &&
      submitted.port === configured.port,
    );
  } catch {
    return false;
  }
}
