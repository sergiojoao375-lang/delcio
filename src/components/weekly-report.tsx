import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Loader2, Mail } from "lucide-react";
import { getWeeklyReport } from "@/lib/weekly.functions";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WeeklyReportCard() {
  const fn = useServerFn(getWeeklyReport);
  const { data, isLoading } = useQuery({ queryKey: ["weeklyReport"], queryFn: () => fn(), staleTime: 600_000 });

  if (isLoading || !data)
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> A preparar o teu boletim semanal…
      </section>
    );

  const max = Math.max(1, ...data.days.map((d) => d.minutes));
  const stats = [
    ["Minutos", `${data.totalMinutes}/${data.goalMinutes}`],
    ["Dias ativos", `${data.daysActive}/7`],
    ["Exercícios", data.exercises],
    ["Palavras novas", data.newWords],
    ["XP", data.totalXp],
    ["Ofensiva", `🔥 ${data.streak}`],
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-primary-dark">
        <BarChart3 className="h-5 w-5" /> Boletim da semana
      </h2>
      <div className="mt-4 flex h-32 items-end gap-2">
        {data.days.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{d.minutes}m</span>
            <div
              className={`w-full rounded-t-md ${d.goalMet ? "bg-primary" : "bg-primary/30"}`}
              style={{ height: `${Math.max(4, (d.minutes / max) * 90)}px` }}
            />
            <span className="text-xs text-muted-foreground">{WD[new Date(`${d.day}T12:00:00Z`).getUTCDay()]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-secondary p-2 text-center">
            <div className="text-base font-bold text-primary-dark">{v}</div>
            <div className="text-[11px] text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-border bg-accent/40 p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary-dark">
          <Mail className="h-4 w-4" /> Carta do Professor Delcio
        </div>
        <p className="text-sm leading-relaxed text-foreground">{data.letter}</p>
      </div>
    </section>
  );
}
