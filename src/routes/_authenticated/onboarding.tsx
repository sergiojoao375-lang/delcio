import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, GraduationCap, Loader2 } from "lucide-react";
import { getLearner, saveOnboarding } from "@/lib/learning.functions";
import {
  DAILY_GOALS,
  GOAL_LABEL,
  LEVELS,
  LEVEL_LABEL,
  daysPerLevel,
  estimatedMonths,
  type Level,
} from "@/lib/levels";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Seu plano de estudo — Delcio-English" },
      {
        name: "description",
        content:
          "Escolha quantos minutos por dia você vai estudar inglês e o seu nível. O Delcio monta o plano e faz o teste de nivelamento.",
      },
      { property: "og:title", content: "Seu plano de estudo — Delcio-English" },
      {
        property: "og:description",
        content: "Meta diária, nível e teste de nivelamento com o professor virtual Delcio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    const learner = await getLearner();
    return learner;
  },
  component: OnboardingPage,
  errorComponent: () => (
    <main className="p-8 text-center text-muted-foreground">Não foi possível carregar o seu plano.</main>
  ),
  notFoundComponent: () => <main className="p-8 text-center">Nada aqui.</main>,
});

function OnboardingPage() {
  const learner = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState<number>(learner.dailyGoalMinutes || 15);
  const [level, setLevel] = useState<Level>(learner.level);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setErr(null);
    try {
      const res = await saveOnboarding({ data: { dailyGoalMinutes: goal, declaredLevel: level } });
      await queryClient.invalidateQueries({ queryKey: ["learner"] });
      if (res.needsTest) {
        navigate({ to: "/teste", search: { kind: "placement" } });
      } else {
        navigate({ to: "/progresso" });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-primary-dark">Vamos montar o seu plano</h1>
          <p className="mt-1 text-muted-foreground">
            Duas perguntas rápidas e o Delcio organiza as suas aulas, a sua ofensiva e os seus testes.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-primary-dark">
            <Clock className="h-4 w-4 text-primary" /> Quanto tempo por dia?
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DAILY_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  goal === g ? "border-primary bg-primary/10" : "border-input hover:bg-accent"
                }`}
              >
                <span className="block font-medium">{GOAL_LABEL[g]}</span>
                <span className="block text-xs text-muted-foreground">
                  Curso completo em cerca de {estimatedMonths(g)} meses
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Com 15 minutos por dia você conclui em no mínimo 3 meses; com 30 minutos, em no mínimo 2 meses. Cada nível
            exige {daysPerLevel(goal)} dias de prática antes do teste de passagem.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-primary-dark">
            <GraduationCap className="h-4 w-4 text-primary" /> Qual o seu nível hoje?
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  level === l ? "border-primary bg-primary/10" : "border-input hover:bg-accent"
                }`}
              >
                <span className="block font-medium">{LEVEL_LABEL[l]}</span>
                <span className="block text-xs text-muted-foreground">
                  {l === "beginner" ? "Começo do zero" : "Precisa de teste rápido"}
                </span>
              </button>
            ))}
          </div>
          {level !== "beginner" && (
            <p className="mt-3 rounded-xl bg-secondary p-3 text-sm">
              Como você indicou um nível acima de beginner, o Delcio vai aplicar um teste prático rápido com leitura,
              gramática e conversação para confirmar em qual nível você deve ficar.
            </p>
          )}
        </section>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <button
          onClick={() => void confirm()}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {level === "beginner" ? "Começar a estudar" : "Fazer o teste de nivelamento"}
        </button>
      </div>
    </main>
  );
}
