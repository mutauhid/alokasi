import "server-only";

type LogContext = Record<string, boolean | number | string | null | undefined>;

const sensitiveKey = /auth|cookie|email|key|note|password|secret|token|url/i;

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = String(error.code);
  return /^(?:P\d{4}|[A-Z0-9_]{2,40})$/u.test(code) ? code : null;
}

export function reportServerFailure(
  event: string,
  error: unknown,
  context: LogContext = {},
) {
  const safeContext = Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? "[redacted]" : value,
    ]),
  );
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorCode = safeErrorCode(error);

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event,
      error: { name: errorName, ...(errorCode ? { code: errorCode } : {}) },
      context: safeContext,
    }),
  );
}
