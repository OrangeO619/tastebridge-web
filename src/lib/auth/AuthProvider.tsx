"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

type AuthCtx = {
  user: User | null;
  /** 已解析的显示名（email 前缀或 full_name）*/
  displayName: string;
  /** 头像 URL（可能为空）*/
  avatarUrl: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  displayName: "",
  avatarUrl: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createSupabaseBrowser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // @ts-ignore
    // @ts-expect-error supabase types
      void sb.auth.getSession().then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session=(r as any).data?.session;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_ev: unknown, session: { user: User } | null) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await createSupabaseBrowser().auth.signOut();
  }, []);

  const meta = user?.user_metadata as { full_name?: string; avatar_url?: string } | undefined;
  const displayName =
    meta?.full_name ??
    (user?.email ? user.email.split("@")[0] : "访客");
  const avatarUrl = meta?.avatar_url ?? null;

  return (
    <AuthContext.Provider value={{ user, displayName, avatarUrl, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
