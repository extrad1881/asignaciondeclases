import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

export const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
export const COORDINATOR_USER_ID = "00000000-0000-4000-8000-000000000002";
const DEFAULT_LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function supabaseStatusEnv() {
  try {
    const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
    return Object.fromEntries(
      output
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => [match[1], match[2]])
    );
  } catch {
    return {};
  }
}

export function getSupabaseTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const statusEnv = supabaseStatusEnv();
  const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonKey =
    configuredAnonKey && !configuredAnonKey.startsWith("postgresql://")
      ? configuredAnonKey
      : statusEnv.PUBLISHABLE_KEY || statusEnv.ANON_KEY || DEFAULT_LOCAL_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || statusEnv.SECRET_KEY || statusEnv.SERVICE_ROLE_KEY;

  if (!anonKey) throw new Error("No se encontro NEXT_PUBLIC_SUPABASE_ANON_KEY ni Publishable key local.");
  if (!serviceRoleKey) throw new Error("No se encontro SUPABASE_SERVICE_ROLE_KEY ni Secret key local.");

  return { url, anonKey, serviceRoleKey };
}

export function createServiceTestClient() {
  const { url, serviceRoleKey } = getSupabaseTestEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function createAuthenticatedTestClient(email: string, password: string) {
  const { url, anonKey } = getSupabaseTestEnv();
  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesion de prueba para ${email}: ${error.message}`);
  return client;
}

export async function requireSingle<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  if (!data) throw new Error("La consulta de prueba no devolvio datos.");
  return data;
}

export async function deleteByIds(client: SupabaseClient, table: string, ids: string[]) {
  if (ids.length === 0) return;
  await client.from(table).delete().in("id", ids);
}
