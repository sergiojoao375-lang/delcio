import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Delcio-English" },
      {
        name: "description",
        content:
          "Entre na sua conta Delcio-English para guardar as suas aulas com o professor virtual e continuar de onde parou.",
      },
      { property: "og:title", content: "Entrar — Delcio-English" },
      {
        property: "og:description",
        content: "Guarde as suas aulas de inglês e volte a elas quando quiser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg("Conta criada! Confirme o seu e-mail para entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e?.message || "Não foi possível continuar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if ((result as any)?.error) {
      setErr("Não foi possível entrar com o Google.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-secondary to-accent">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl p-6 sm:p-8 border border-border">
        <h1 className="text-2xl font-bold text-center text-primary-dark">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="text-center text-muted-foreground mt-2 mb-6 text-sm">
          Guarde as suas aulas com o Delcio e volte a elas quando quiser.
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-medium hover:bg-accent transition disabled:opacity-60"
        >
          Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Seu nome
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2"
                placeholder="Délcio"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2"
              placeholder="••••••"
            />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-primary-dark">{msg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60"
          >
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErr(null);
            setMsg(null);
          }}
          className="mt-4 w-full text-sm text-primary hover:underline"
        >
          {mode === "signin" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
        </button>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            Voltar ao chat
          </Link>
        </div>
      </div>
    </main>
  );
}
