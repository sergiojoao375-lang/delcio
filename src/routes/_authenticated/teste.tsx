import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, MessageCircle, SpellCheck } from "lucide-react";
import { startTest, submitTest } from "@/lib/learning.functions";
import { LEVEL_LABEL, PASS_SCORE, type Level } from "@/lib/levels";

type Kind = "placement" | "levelup";

type Question = {
  id: string;
  skill: "reading" | "grammar" | "conversation";
  prompt: string;
  passage?: string;
};

type Test = { id: string; kind: string; fromLevel: string; toLevel: string; questions: Question[] };

type Result = {
  score: number;
  passed: boolean;
  feedback: string;
  recommendedLevel: Level;
  skills: { reading: number; grammar: number; conversation: number };
  kind: Kind;
};

export const Route = createFileRoute("/_authenticated/teste")({
  validateSearch: (search: Record<string, unknown>): { kind: Kind } => ({
    kind: search.kind === "placement" ? "placement" : "levelup",
  }),
  head: () => ({
    meta: [
      { title: "Teste de nível — Delcio-English" },
      {
        name: "description",
        content:
          "Teste prático de inglês com leitura, gramática e conversação, montado a partir das suas conversas e aulas.",
      },
      { property: "og:title", content: "Teste de nível — Delcio-English" },
      {
        property: "og:description",
        content: "Leitura, gramática e conversação avaliados pelo professor virtual Delcio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestPage,
  errorComponent: () => (
    <main className="p-8 text-center text-muted-foreground">Não foi possível carregar o teste.</main>
  ),
  notFoundComponent: () => <main className="p-8 text-center">Nada aqui.</main>,
});

const SKILL_META = {
  reading: { label: "Leitura", icon: BookOpen },
  grammar: { label: "Gramática", icon: SpellCheck },
  conversation: { label: "Conversação", icon: MessageCircle },
} as const;

function TestPage() {
  const { kind } = Route.useSearch();
  const queryClient = useQueryClient();
  const [test, setTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function begin() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await startTest({ data: { kind } });
      if (res.started) {
        setTest(res.test as Test);
        setAnswers({});
        setResult(null);
      } else if (res.reason === "locked") {
        setNotice(
          "O teste ainda está bloqueado: você precisa manter a ofensiva e somar pontos suficientes com os exercícios das aulas.",
        );
      } else if (res.reason === "max_level") {
        setNotice("Você já está no nível mais alto do curso. Parabéns!");
      } else {
        setNotice("Não consegui montar o teste agora. Tente novamente em instantes.");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível iniciar o teste.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!test) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await submitTest({
        data: {
          testId: test.id,
          answers: test.questions.map((q) => ({ id: q.id, answer: answers[q.id] ?? "" })),
        },
      });
      setResult(res as Result);
      setTest(null);
      await queryClient.invalidateQueries({ queryKey: ["learner"] });
      await queryClient.invalidateQueries({ queryKey: ["testHistory"] });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível enviar o teste.");
    } finally {
      setBusy(false);
    }
  }

  const answeredAll =
    !!test && test.questions.every((q) => (answers[q.id] ?? "").trim().length > 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-dark">
            {kind === "placement" ? "Teste de nivelamento" : "Teste de passagem de nível"}
          </h1>
          <Link to="/progresso" className="text-sm text-primary hover:underline">
            Meu progresso
          </Link>
        </div>

        {!test && !result && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-muted-foreground">
              São 6 questões práticas: leitura, gramática e conversação.{" "}
              {kind === "levelup"
                ? "As questões saem do seu histórico de conversas e das aulas que você já estudou."
                : "As questões são calibradas para o nível que você indicou."}{" "}
              {kind === "levelup" && `Você precisa de pelo menos ${PASS_SCORE} pontos de 100 para passar.`}
            </p>
            <button
              onClick={() => void begin()}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Montando o teste..." : "Começar o teste"}
            </button>
            {notice && <p className="mt-3 text-sm text-primary-dark">{notice}</p>}
          </section>
        )}

        {test && (
          <section className="space-y-4">
            {test.questions.map((q, i) => {
              const meta = SKILL_META[q.skill];
              const Icon = meta.icon;
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs text-primary-dark">
                    <Icon className="h-3.5 w-3.5" /> {meta.label} · questão {i + 1}
                  </div>
                  {q.passage && (
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-secondary p-3 text-sm leading-relaxed">
                      {q.passage}
                    </p>
                  )}
                  <p className="mt-3 font-medium">{q.prompt}</p>
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    rows={q.skill === "conversation" ? 4 : 2}
                    placeholder="Escreva a sua resposta em inglês"
                    className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2"
                  />
                </div>
              );
            })}
            {notice && <p className="text-sm text-destructive">{notice}</p>}
            <button
              onClick={() => void send()}
              disabled={busy || !answeredAll}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Corrigindo..." : answeredAll ? "Enviar para correção" : "Responda todas as questões"}
            </button>
          </section>
        )}

        {result && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-bold text-primary-dark">
              {result.kind === "placement"
                ? `Seu nível é ${LEVEL_LABEL[result.recommendedLevel]}`
                : result.passed
                  ? "Aprovado! Você subiu de nível 🎉"
                  : "Ainda não foi desta vez"}
            </h2>
            <p className="mt-2 text-3xl font-bold">{result.score}/100</p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <li className="rounded-xl bg-secondary p-3">Leitura: {result.skills.reading}</li>
              <li className="rounded-xl bg-secondary p-3">Gramática: {result.skills.grammar}</li>
              <li className="rounded-xl bg-secondary p-3">Conversação: {result.skills.conversation}</li>
            </ul>
            {result.feedback && <p className="mt-4 whitespace-pre-wrap">{result.feedback}</p>}
            <div className="mt-5 flex gap-3">
              <Link
                to="/aulas"
                className="rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
              >
                Ir para as aulas
              </Link>
              <Link to="/progresso" className="rounded-xl border border-input px-4 py-2 hover:bg-accent">
                Ver progresso
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
