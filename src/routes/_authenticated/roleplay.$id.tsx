import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SCENARIOS, scenarioContext } from "@/lib/scenarios";
import { TeacherChat } from "@/components/teacher-chat";
import { usePractice } from "@/hooks/use-practice";
import { getLearner } from "@/lib/learning.functions";

export const Route = createFileRoute("/_authenticated/roleplay/$id")({
  loader: ({ params }) => {
    const s = SCENARIOS.find((x) => x.id === params.id);
    if (!s) throw notFound();
    return s;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Cenário"} — Delcio-English` },
      { name: "description", content: "Roleplay de conversa em inglês com o professor virtual." },
      { property: "og:title", content: `${loaderData?.title ?? "Cenário"} — Delcio-English` },
      { property: "og:description", content: "Pratique uma situação real em inglês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoleplayPage,
  notFoundComponent: () => <main className="p-8 text-center">Cenário não encontrado.</main>,
  errorComponent: () => <main className="p-8 text-center">Não foi possível abrir o cenário.</main>,
});

function RoleplayPage() {
  const s = Route.useLoaderData();
  usePractice(true);
  const [name, setName] = useState("amigo");
  const [level, setLevel] = useState<string | undefined>();
  useEffect(() => {
    const n = localStorage.getItem("delcio.name");
    if (n) setName(n);
    getLearner().then((l) => setLevel(l.level)).catch(() => {});
  }, []);
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/roleplay" className="text-sm text-primary hover:underline">← Todos os cenários</Link>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h1 className="text-2xl font-bold text-primary-dark">{s.emoji} {s.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Objetivo: {s.goal}</p>
        </div>
        <TeacherChat
          userName={name}
          learningLang="en"
          lessonContext={scenarioContext(s)}
          lessonTitle={s.title}
          starter={s.starter}
          {...(level ? { level } : {})}
        />
      </div>
    </main>
  );
}
