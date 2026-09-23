import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, Shield, Star, Target, Trophy, Loader2 } from "lucide-react";
import { buyShield, getLearner, listTestHistory, updateDailyGoal } from "@/lib/learning.functions";
import {
  DAILY_GOALS,
  GOAL_LABEL,
  LEVELS,
  LEVEL_LABEL,
  SHIELD_COST,
  SHIELD_MAX,
  estimatedMonths,
  type Level,
} from "@/lib/levels";

const learnerQuery = queryOptions({ queryKey: ["learner"], queryFn: () => getLearner() });
const historyQuery = queryOptions({ queryKey: ["testHistory"], queryFn: () => listTestHistory() });

export const Route = createFileRoute("/_authenticated/progresso")({
  head: () => ({
    meta: [
      { title: "Meu progresso — Delcio-English" },
      {
        name: "description",
        content:
          "Acompanhe a sua ofensiva, pontos, escudos, meta diária e quando o teste de passagem de nível é liberado.",
      },
      { property: "og:title", content: "Meu progresso — Delcio-English" },
      {
        property: "og:description",
        content: "Ofensiva, pontos, escudos e testes de nível no Delcio-English.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(learnerQuery);
    await context.queryClient.ensureQueryData(historyQuery);
  },
  component: ProgressPage,
  errorComponent: () => (
    <main className="p-8 text-center text-muted-foreground">Não foi possível carregar o seu progresso.</main>
  ),
  notFoundComponent: () => <main className="p-8 text-center">Nada aqui.</main>,
});

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-secondary">
      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ProgressPage() {
  const { data: learner } = useSuspenseQuery(learnerQuery);
  const { data: history } = useSuspenseQuery(historyQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function shield() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await buyShield();
      if (res.ok) {
        setNotice("Escudo de ofensiva adquirido! Ele protege a sua ofensiva em um dia sem estudar.");
        await queryClient.invalidateQueries({ queryKey: ["learner"] });
      } else if (res.reason === "max") {
        setNotice(`Você já tem o máximo de ${SHIELD_MAX} escudos.`);
      } else {
        setNotice(`Pontos insuficientes: um escudo custa ${SHIELD_COST} pontos.`);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível comprar o escudo.");
    } finally {
      setBusy(false);
    }
  }

  async function changeGoal(minutes: number) {
    setBusy(true);
    try {
      await updateDailyGoal({ data: { dailyGoalMinutes: minutes } });
      await queryClient.invalidateQueries({ queryKey: ["learner"] });
    } finally {
      setBusy(false);
    }
  }

  const levelIndex = LEVELS.indexOf(learner.level as Level);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-dark">Meu progresso</h1>
          <Link to="/" className="text-sm text-primary hover:underline">
            Voltar ao chat
          </Link>
        </div>

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-primary" /> Ofensiva
            </div>
            <p className="mt-1 text-2xl font-bold">{learner.streak} dias</p>
            <p className="text-xs text-muted-foreground">recorde: {learner.streakBest}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-primary" /> Pontos
            </div>
            <p className="mt-1 text-2xl font-bold">{learner.points}</p>
            <p className="text-xs text-muted-foreground">total ganho: {learner.xpTotal}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" /> Escudos
            </div>
            <p className="mt-1 text-2xl font-bold">{learner.shields}</p>
            <p className="text-xs text-muted-foreground">{SHIELD_COST} pontos cada</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" /> Nível
            </div>
            <p className="mt-1 text-lg font-bold">{LEVEL_LABEL[learner.level as Level]}</p>
            <p className="text-xs text-muted-foreground">
              {levelIndex + 1} de {LEVELS.length}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-primary-dark">
            <Target className="h-4 w-4 text-primary" /> Meta de hoje
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {learner.today.minutes} de {learner.dailyGoalMinutes} minutos · {learner.today.xp} pontos ganhos hoje ·{" "}
            {learner.today.exercises} exercícios
          </p>
          <Bar value={learner.today.minutes} max={learner.dailyGoalMinutes} />
          {learner.today.goalMet ? (
            <p className="mt-2 text-sm text-primary-dark">Meta cumprida hoje — ofensiva garantida! 🔥</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Cumpra a meta para manter a ofensiva. Praticando além da meta você acumula pontos extras.
            </p>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium">Mudar a meta diária</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAILY_GOALS.map((g) => (
                <button
                  key={g}
                  disabled={busy}
                  onClick={() => void changeGoal(g)}
                  className={`rounded-xl border px-3 py-2 text-sm transition disabled:opacity-60 ${
                    learner.dailyGoalMinutes === g ? "border-primary bg-primary/10" : "border-input hover:bg-accent"
                  }`}
                >
                  {GOAL_LABEL[g]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              No seu ritmo atual, o curso completo leva cerca de {estimatedMonths(learner.dailyGoalMinutes)} meses.
            </p>
          </div>

          <button
            onClick={() => void shield()}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm hover:bg-accent disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Comprar escudo ({SHIELD_COST} pontos)
          </button>
          {notice && <p className="mt-3 text-sm text-primary-dark">{notice}</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-primary-dark">Teste de passagem de nível</h2>
          {learner.nextLevel ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Próximo nível: {LEVEL_LABEL[learner.nextLevel as Level]}. O teste tem leitura, gramática e conversação,
                feito a partir do seu histórico de conversas e aulas.
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  Pontos no nível atual: {learner.levelXp} / {learner.levelXpRequired}
                  <Bar value={learner.levelXp} max={learner.levelXpRequired} />
                </li>
                <li>
                  Dias de prática no nível: {learner.levelDays} / {learner.levelDaysRequired}
                  <Bar value={learner.levelDays} max={learner.levelDaysRequired} />
                </li>
                <li>
                  Ofensiva atual: {learner.streak} / {learner.streakRequired} dias seguidos
                  <Bar value={learner.streak} max={learner.streakRequired} />
                </li>
              </ul>
              <button
                disabled={!learner.testUnlocked}
                onClick={() => navigate({ to: "/teste", search: { kind: "levelup" } })}
                className="mt-4 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {learner.testUnlocked ? "Fazer o teste agora" : "Teste bloqueado"}
              </button>
              {!learner.testUnlocked && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Continue resolvendo os exercícios das aulas e conversando com o Delcio para liberar o teste.
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Você chegou ao nível mais alto do curso. Continue praticando para não perder o ritmo!
            </p>
          )}
        </section>

        {history.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-primary-dark">Testes anteriores</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {history.map((t: any) => (
                <li key={t.id} className="rounded-xl bg-secondary p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {t.kind === "placement" ? "Nivelamento" : `Passagem para ${t.to_level}`}
                    </span>
                    <span>{t.score}/100</span>
                  </div>
                  {t.feedback && <p className="mt-1 text-muted-foreground">{t.feedback}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
