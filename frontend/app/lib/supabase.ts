import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";

function getConfig(): { url: string | undefined; serverKey: string | undefined } {
  return { url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, serverKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY };
}

export function getSupabaseAdmin(): SupabaseClient {
  const { url, serverKey } = getConfig();
  if (!url || !serverKey) throw new AppError("SUPABASE_NOT_CONFIGURED", "Supabase server configuration is missing. Add SUPABASE_URL and SUPABASE_SECRET_KEY.", 503);
  if (!serverKey.startsWith("sb_secret_") && !serverKey.startsWith("eyJ")) throw new AppError("SUPABASE_NOT_CONFIGURED", "The configured Supabase server key is invalid. Use a secret key beginning with sb_secret_ or a legacy service-role JWT beginning with eyJ.", 503);
  return createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function isSupabaseConfigured(): boolean {
  const { url, serverKey } = getConfig();
  return Boolean(url && serverKey && (serverKey.startsWith("sb_secret_") || serverKey.startsWith("eyJ")));
}

export function supabaseTableError(error: { code?: string; message?: string } | null | undefined, table: string, operation: "read" | "write", fallback: string): AppError {
  const providerCode = error?.code;
  const missingTable = providerCode === "PGRST205" || providerCode === "42P01" || error?.message?.toLowerCase().includes("could not find the table");
  if (missingTable) return new AppError("SUPABASE_SCHEMA_NOT_READY", `Database table public.${table} is missing. Apply supabase/migrations/202609140001_initial_schema.sql in your Supabase project, then retry.`, 503, { table, providerCode });
  return new AppError(operation === "write" ? "SUPABASE_WRITE_FAILED" : "SUPABASE_QUERY_FAILED", error?.message ?? fallback, 500, { table, providerCode });
}
