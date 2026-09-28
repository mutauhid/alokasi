import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireAuthAdminConfig } from "./config";

export function createSupabaseAdminClient() {
  const config = requireAuthAdminConfig();
  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
