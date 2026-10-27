"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase client.
 * Uses the publishable key only — never a service-role/secret key.
 * All data access is guarded by Row Level Security.
 * One shared instance so Auth and Realtime use the same JWT.
 */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }
  browserClient = createBrowserClient(url, key);
  return browserClient;
}
