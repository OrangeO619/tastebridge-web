"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    const sb = createSupabaseBrowser();
    try {
      if (mode === "signup") {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("注册成功！请检查邮箱确认链接，然后登录。");
        setMode("signin");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await createSupabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-zinc-900 via-stone-900 to-zinc-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">TasteBridge</h1>
          <p className="mt-1 text-sm text-white/50">以地图为核心的探店记忆共享平台</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/10 backdrop-blur-sm">
          <div className="flex border-b border-white/10">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  mode === m ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >{m === "signin" ? "登录" : "注册"}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-xs text-white/60">邮箱</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="w-full rounded-xl bg-white/8 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none ring-1 ring-white/15 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">密码</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" minLength={6}
                  className="w-full rounded-xl bg-white/8 px-3 py-2.5 pr-10 text-sm text-white placeholder-white/25 outline-none ring-1 ring-white/15 focus:ring-amber-500"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >{showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-300">{error}</p>}
            {info && <p className="rounded-lg bg-green-900/40 px-3 py-2 text-xs text-green-300">{info}</p>}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
              {mode === "signin" ? "登录" : "注册"}
            </button>

            <div className="relative my-2 flex items-center">
              <div className="flex-1 border-t border-white/10"/>
              <span className="mx-3 text-xs text-white/30">或</span>
              <div className="flex-1 border-t border-white/10"/>
            </div>

            <button type="button" onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              使用 Google 登录
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
