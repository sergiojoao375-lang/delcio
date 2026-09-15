import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { readClientErrorLog, clearClientErrorLog, type ClientErrorEntry } from "@/lib/api-client";

export const Route = createFileRoute("/debug")({
  head: () => ({
    meta: [
      { title: "Debug — Delcio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DebugPage,
});

function DebugPage() {
  const [entries, setEntries] = useState<ClientErrorEntry[]>([]);
  useEffect(() => setEntries(readClientErrorLog()), []);

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Erros recentes do cliente</h1>
          <button
            onClick={() => {
              clearClientErrorLog();
              setEntries([]);
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            Limpar
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Últimas {entries.length} falhas guardadas localmente (máx 20). Útil para reportar problemas.
        </p>
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Sem erros registados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2">Quando</th>
                  <th className="p-2">URL</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Tentativas</th>
                  <th className="p-2">Request ID</th>
                  <th className="p-2">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(e.ts).toLocaleString()}</td>
                    <td className="p-2 font-mono text-xs">{e.url}</td>
                    <td className="p-2">{e.status ?? "—"}</td>
                    <td className="p-2">{e.attempts}</td>
                    <td className="p-2 font-mono text-xs">{e.requestId}</td>
                    <td className="p-2 text-xs">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
