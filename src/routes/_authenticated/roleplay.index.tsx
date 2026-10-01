import { createFileRoute, Link } from "@tanstack/react-router";
import { SCENARIOS } from "@/lib/scenarios";

export const Route = createFileRoute("/_authenticated/roleplay/")({
  head: () => ({
    meta: [
      { title: "Cenários de conversa — Delcio-English" },
      { name: "description", content: "Pratique inglês em situações reais: café, aeroporto, entrevista, hotel e mais." },
      { property: "og:title", content: "Cenários de conversa — Delcio-English" },
      { property: "og:description", content: "Roleplay com o professor virtual em situações do dia a dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoleplayList,
});

function RoleplayList() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/" className="text-sm text-primary hover:underline">← Início</Link>
        <h1 className="text-2xl font-bold text-primary-dark">Cenários de conversa</h1>
        <p className="text-muted-foreground">Escolha uma situação. O Delcio faz o papel do atendente e guia você até o objetivo.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <Link
              key={s.id}
              to="/roleplay/$id"
              params={{ id: s.id }}
              className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary"
            >
              <div className="text-3xl">{s.emoji}</div>
              <h2 className="mt-2 font-semibold text-primary-dark">{s.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{s.goal}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
