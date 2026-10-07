import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "delcio.reminder";
type Cfg = { enabled: boolean; time: string; lastShown?: string };

const MESSAGES = [
  "O Professor Delcio está à tua espera para uns minutinhos de conversa! 🔥",
  "Hora do inglês! Não deixes a tua ofensiva apagar. 💪",
  "5 minutos hoje já fazem diferença. Vamos praticar? 🇬🇧",
];

function load(): Cfg {
  try {
    return { enabled: false, time: "19:00", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { enabled: false, time: "19:00" };
  }
}

async function notify(body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => undefined);
  const opts = { body, icon: "/favicon.ico", tag: "delcio-reminder" };
  if (reg) await reg.showNotification("Delcio English", opts);
  else new Notification("Delcio English", opts);
}

/** Runs in the background of every page: fires the reminder at the chosen time. */
export function ReminderScheduler() {
  useEffect(() => {
    const tick = () => {
      const cfg = load();
      if (!cfg.enabled) return;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const hhmm = now.toTimeString().slice(0, 5);
      if (hhmm >= cfg.time && cfg.lastShown !== today) {
        localStorage.setItem(KEY, JSON.stringify({ ...cfg, lastShown: today }));
        void notify(MESSAGES[now.getDate() % MESSAGES.length]!);
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

export function StudyReminders() {
  const [cfg, setCfg] = useState<Cfg>({ enabled: false, time: "19:00" });
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setCfg(load()), []);

  function save(next: Cfg) {
    setCfg(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  async function toggle() {
    if (cfg.enabled) return save({ ...cfg, enabled: false });
    if (!("Notification" in window)) return setMsg("Este navegador não suporta notificações.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setMsg("Permite as notificações no navegador para receber lembretes.");
    const today = new Date().toISOString().slice(0, 10);
    save({ ...cfg, enabled: true, lastShown: new Date().toTimeString().slice(0, 5) >= cfg.time ? today : undefined } as Cfg);
    setMsg(`Lembrete ativo todos os dias às ${cfg.time}.`);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-primary-dark">
        <Bell className="h-5 w-5" /> Lembrete diário
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolhe a melhor hora para estudar. O Delcio avisa-te com uma mensagem amigável.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="time"
          value={cfg.time}
          onChange={(e) => save({ ...cfg, time: e.target.value, lastShown: undefined } as Cfg)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          aria-label="Hora do lembrete"
        />
        <Button onClick={toggle} variant={cfg.enabled ? "outline" : "default"}>
          {cfg.enabled ? <><BellOff className="mr-1 h-4 w-4" /> Desligar</> : <><Bell className="mr-1 h-4 w-4" /> Ativar lembrete</>}
        </Button>
        {cfg.enabled && (
          <Button variant="ghost" onClick={() => notify(MESSAGES[0]!)}>
            Testar agora
          </Button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Funciona enquanto o app estiver aberto ou instalado no telemóvel.</p>
    </section>
  );
}
