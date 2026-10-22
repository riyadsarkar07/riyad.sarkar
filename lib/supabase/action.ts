import "server-only";

import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";

export async function createActionClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await createClient();
  } catch {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) return null;
    return createJsClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}
