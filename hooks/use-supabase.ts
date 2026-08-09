"use client";

import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Memoized browser Supabase client for client components. */
export function useSupabase(): SupabaseClient {
  return useMemo(() => createClient(), []);
}
