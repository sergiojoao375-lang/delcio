import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Volume2 } from "lucide-react";
import { listLessons } from "@/lib/db.functions";

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
        content: "Escolha uma aula com texto, áudio e exercícios e pratique com o professor virtual Delcio.",
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

function LessonsPage() {
  const { data: lessons } = useSuspenseQuery(lessonsQuery);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-dark">Aulas</h1>
          <Link to="/" className="text-sm text-primary hover:underline">
            Voltar ao chat
          </Link>
        </div>

        {lessons.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Ainda não há aulas publicadas.
          </p>
        )}

        <ul className="space-y-3">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                to="/aulas/$id"
                params={{ id: lesson.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-primary-dark">{lesson.title}</h2>
                  {!lesson.published && (
                    <span className="rounded bg-accent px-2 py-0.5 text-xs">rascunho</span>
                  )}
                </div>
                {lesson.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                )}
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
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
