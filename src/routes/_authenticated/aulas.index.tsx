import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Volume2, Sparkles, Loader2 } from "lucide-react";
import { listLessons, type Lesson } from "@/lib/db.functions";
import { generateLessonFromHistory } from "@/lib/autolesson.functions";

const lessonsQuery = queryOptions({
  queryKey: ["lessons"],
  queryFn: () => listLessons(),
});

export const Route = createFileRoute("/_authenticated/aulas/")({
  head: () => ({
    meta: [
      { title: "Aulas — Delcio-English" },
      {
        name: "description",
        content: "Aulas personalizadas criadas pela IA a partir das suas conversas, com texto, áudio e exercícios.",
      },
      { property: "og:title", content: "Aulas — Delcio-English" },
      {
        property: "og:description",
        content: "Aulas com texto, áudio e exercícios para praticar inglês com o Delcio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(lessonsQuery),
  component: LessonsPage,
  errorComponent: () => (
    <main className="p-8 text-center">
      <p className="text-muted-foreground">Não foi possível carregar as aulas.</p>
    </main>
  ),
  notFoundComponent: () => <main className="p-8 text-center">Nada aqui.</main>,
});

function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link
      to="/aulas/$id"
      params={{ id: lesson.id }}
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
    >
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-primary-dark">{lesson.title}</h2>
        {lesson.source === "auto" && (
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary-dark">
            <Sparkles className="h-3 w-3" /> para você
          </span>
        )}
        {!lesson.published && <span className="rounded bg-accent px-2 py-0.5 text-xs">rascunho</span>}
      </div>
      {lesson.description && <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-primary/10 px-2 py-0.5 text-primary-dark">{lesson.level}</span>
        <span>{lesson.language === "en" ? "Inglês" : "Português"}</span>
        {lesson.audio_url && (
          <span className="inline-flex items-center gap-1">
            <Volume2 className="h-3 w-3" /> com áudio
          </span>
        )}
        {lesson.exercises.length > 0 && <span>{lesson.exercises.length} exercícios</span>}
      </div>
    </Link>
  );
}

function LessonsPage() {
  const { data: lessons } = useSuspenseQuery(lessonsQuery);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const autoTried = useRef(false);

  const mine = lessons.filter((l) => l.source === "auto");
  const catalog = lessons.filter((l) => l.source !== "auto");

  async function generate(force: boolean) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await generateLessonFromHistory({ data: { force } });
      if (result.created) {
        await queryClient.invalidateQueries({ queryKey: ["lessons"] });
        setNotice(`Nova aula criada para você: “${result.title}”.`);
      } else if (force && result.reason === "not_enough") {
        setNotice(
          "Ainda não há correções suficientes nas suas conversas. Converse mais um pouco com o Delcio e volte aqui.",
        );
      } else if (force) {
        setNotice("Não consegui criar a aula agora. Tente novamente em instantes.");
      }
    } catch (err) {
      if (force) setNotice(err instanceof Error ? err.message : "Não foi possível criar a aula agora.");
    } finally {
      setBusy(false);
    }
  }

  // Cria aulas automaticamente quando o aluno acumula novas correções.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    void generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-dark">Aulas</h1>
          <Link to="/" className="text-sm text-primary hover:underline">
            Voltar ao chat
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-primary-dark">
                <Sparkles className="h-4 w-4 text-primary" /> Aulas feitas para você
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O Delcio analisa as correções das suas conversas e monta aulas e exercícios só com os seus erros.
              </p>
            </div>
            <button
              onClick={() => void generate(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Criando..." : "Criar aula agora"}
            </button>
          </div>
          {notice && <p className="mt-3 text-sm text-primary-dark">{notice}</p>}

          <ul className="mt-4 space-y-3">
            {mine.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard lesson={lesson} />
              </li>
            ))}
          </ul>
          {mine.length === 0 && !busy && (
            <p className="mt-4 text-sm text-muted-foreground">
              Ainda nenhuma aula personalizada. Converse com o Delcio — assim que houver correções suficientes, a aula
              aparece aqui automaticamente.
            </p>
          )}
        </div>

        <h2 className="mb-3 font-semibold text-primary-dark">Catálogo</h2>
        {catalog.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Ainda não há aulas publicadas no catálogo.
          </p>
        )}
        <ul className="space-y-3">
          {catalog.map((lesson) => (
            <li key={lesson.id}>
              <LessonCard lesson={lesson} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
