import { reportServerFailure } from "@/server/observability/logger";

type AuthFailure = {
  code?: string;
  status?: number;
};

const signUpErrorKeys: Record<string, string> = {
  signup_disabled: "signup-disabled",
  email_provider_disabled: "email-disabled",
  email_address_invalid: "email-invalid",
  email_address_not_authorized: "email-not-authorized",
  weak_password: "weak-password",
  over_email_send_rate_limit: "email-rate-limit",
  over_request_rate_limit: "request-rate-limit",
  captcha_failed: "captcha",
};

export function signUpErrorKey(error: AuthFailure) {
  if (error.status === 0) return "unavailable";
  return error.code ? (signUpErrorKeys[error.code] ?? "signup") : "signup";
}

export function reportAuthFailure(operation: "signup", error: AuthFailure) {
  // Deliberately exclude message, form values, email, tokens, and provider body.
  reportServerFailure(`auth.${operation}_provider_failed`, error, {
    providerCode: error.code ?? "unknown",
    providerStatus: error.status ?? "unknown",
  });
}
