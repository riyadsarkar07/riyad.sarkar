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
import { isSupabaseConfigured } from "@/lib/supabase/env";
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
  sendRecoveryCode: (email: string) => Promise<{ error: string | null }>;
  verifyRecoveryCode: (email: string, token: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string, currentPassword?: string) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const UNAVAILABLE = { error: "Authentication is temporarily unavailable." as string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => (isSupabaseConfigured() ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isLoaded = !loading;
  const mounted = useRef(true);

  const loadProfile = useCallback(async (uid: string) => {
    if (!supabase) return;
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
    if (!supabase) {
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    if (!supabase || !user) return;
    const ping = () => {
      supabase.rpc("touch_last_activity").then(() => undefined);
    };
    ping();
    const timer = window.setInterval(ping, 45_000);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabase, user]);

  const signUp = useCallback(
    async (data: { fullName: string; email: string; phone: string; password: string }) => {
      if (!supabase) return { needsEmailConfirmation: false, ...UNAVAILABLE };
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
      if (!supabase) return UNAVAILABLE;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  /**
   * Sends a 6-digit password-recovery OTP to the email via Supabase Auth
   * (email OTP). `shouldCreateUser: false` prevents account creation and
   * keeps the response silent for unknown emails (no account enumeration).
   */
  const sendRecoveryCode = useCallback(
    async (email: string) => {
      if (!supabase) return UNAVAILABLE;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  /**
   * Verifies the emailed 6-digit recovery OTP. On success a session is
   * established so `updatePassword` can change the password directly.
   */
  const verifyRecoveryCode = useCallback(
    async (email: string, token: string) => {
      if (!supabase) return UNAVAILABLE;
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  /**
   * Updates the signed-in user's password. When the session is not a password
   * recovery flow (and the project requires it), the current password must be
   * supplied so Supabase can verify the request.
   */
  const updatePassword = useCallback(
    async (password: string, currentPassword?: string) => {
      if (!supabase) return UNAVAILABLE;
      const { error } = await supabase.auth.updateUser({
        password,
        ...(currentPassword ? { current_password: currentPassword } : {}),
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!supabase) return UNAVAILABLE;
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
      sendRecoveryCode,
      verifyRecoveryCode,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [user, profile, isAdmin, loading, isLoaded, signUp, signIn, signOut, sendRecoveryCode, verifyRecoveryCode, updatePassword, updateProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
