import "server-only";

export type AuthConfig = { url: string; publishableKey: string };
export type AuthAdminConfig = { url: string; secretKey: string };

export function getAuthConfig(): AuthConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1") {
      return null;
    }
  } catch {
    return null;
  }
  return { url, publishableKey };
}

export function requireAuthConfig(): AuthConfig {
  const config = getAuthConfig();
  if (!config) {
    throw new Error(
      "Supabase Auth belum dikonfigurasi. Isi variabel NEXT_PUBLIC_SUPABASE_*.",
    );
  }
  return config;
}

export function getAuthAdminConfig(): AuthAdminConfig | null {
  const config = getAuthConfig();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return config && secretKey ? { url: config.url, secretKey } : null;
}

export function requireAuthAdminConfig(): AuthAdminConfig {
  const config = getAuthAdminConfig();
  if (!config) {
    throw new Error(
      "Supabase Auth Admin belum dikonfigurasi. Isi SUPABASE_SECRET_KEY di server.",
    );
  }
  return config;
}
