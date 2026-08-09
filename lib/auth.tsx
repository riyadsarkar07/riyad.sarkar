"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/dashboard";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  isLoaded: boolean;
  signUp: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ needsEmailConfirmation: boolean; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isLoaded = !loading;
  const mounted = useRef(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (!error && data) setProfile(data as Profile);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted.current) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
        const { data } = await supabase.rpc("is_admin");
        setIsAdmin(!!data);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted.current) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
        const { data } = await supabase.rpc("is_admin");
        setIsAdmin(!!data);
        supabase.rpc("touch_last_activity").then(() => undefined);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signUp = useCallback(
    async (data: { fullName: string; email: string; phone: string; password: string }) => {
      const { data: res, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName, phone: data.phone },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return {
        needsEmailConfirmation: !res.session,
        error: error?.message ?? null,
      };
    },
    [supabase],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!user) return { error: "Not signed in" };
      const { error } = await supabase
        .from("profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (!error) {
        await loadProfile(user.id);
        if (data.full_name) {
          await supabase.auth.updateUser({ data: { full_name: data.full_name } });
        }
      }
      return { error: error?.message ?? null };
    },
    [supabase, user, loadProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin,
      loading,
      isLoaded,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [user, profile, isAdmin, loading, isLoaded, signUp, signIn, signOut, resetPassword, updatePassword, updateProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
