import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Konfigurasi Supabase Auth belum lengkap.");
  process.exit(1);
}
try {
  const endpoint = new URL("/auth/v1/health", url);
  const response = await fetch(endpoint, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw Object.assign(new Error(), { code: `HTTP_${response.status}` });
  console.log("Supabase Auth dapat dijangkau melalui HTTPS.");
} catch (error) {
  const code =
    typeof error?.code === "string" ? error.code : "AUTH_UNAVAILABLE";
  console.error(
    `Pemeriksaan Supabase Auth gagal (${code}). Credential tidak ditampilkan.`,
  );
  process.exitCode = 1;
}
