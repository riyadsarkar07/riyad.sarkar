import "server-only";

import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";

const FETCH_TIMEOUT_MS = 12_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const parent = init?.signal;
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function createActionClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    console.error("[supabase] public URL or publishable key is missing");
    return null;
  }

  try {
    return await createClient();
  } catch (error) {
    console.error("[supabase] cookie client unavailable; using anon client", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) return null;
    return createJsClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    });
  }
}
