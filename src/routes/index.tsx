import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Languages, RefreshCcw, Flame, Trophy, Sparkles, PartyPopper, Star, Crown, Play, Volume2 } from "lucide-react";
import { VOICES, DEFAULT_VOICE_ID, getVoice } from "@/lib/voices";
import { SpeakingAvatar } from "@/components/speaking-avatar";
import { fetchWithRetry } from "@/lib/api-client";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useIsMobile } from "@/hooks/use-mobile";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delcio-English — Aprende inglês conversando" },
      {
        name: "description",
        content:
          "Pratique inglês ou português com Delcio, o professor de IA. Conversação, correções gentis, áudio e tradução instantânea.",
      },
      { property: "og:title", content: "Delcio-English — Aprende inglês conversando" },
      {
        property: "og:description",
        content:
          "Pratique inglês ou português com Delcio, o professor de IA. Conversação, correções gentis, áudio e tradução instantânea.",
      },
    ],
  }),
  component: Index,
});

type LearningLang = "en" | "pt";

type Bubble =
  | { id: string; kind: "bot"; text: string; translation?: string; voiceId?: string }
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "correction"; text: string };

const LEVELS = ["Iniciante", "Básico", "Elementar", "Pré-intermediário", "Intermediário"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function stripScore(content: string): { clean: string; correct: boolean | null } {
  const match = content.match(/<score>([\s\S]*?)<\/score>/i);
  let correct: boolean | null = null;
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed.correct === "boolean") correct = parsed.correct;
    } catch {
      /* ignore */
    }
  }
  const clean = content.replace(/<score>[\s\S]*?<\/score>/gi, "").trim();
  return { clean, correct };
}

function splitCorrection(text: string): { correction?: string; rest: string } {
  // Find first line starting with ✏️
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim().startsWith("✏️"));
  if (idx === -1) return { rest: text };
  const correction = lines[idx].replace(/^✏️\s*/, "").trim();
  const rest = lines.filter((_, i) => i !== idx).join("\n").trim();
  return { correction, rest };
}

function Index() {
  const [stage, setStage] = useState<"welcome" | "chat">("welcome");
  const [name, setName] = useState("");
  const [learningLang, setLearningLang] = useState<LearningLang>("en");

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [recording, setRecording] = useState(false);
  const [micHelp, setMicHelp] = useState<null | "requesting" | "blocked" | "embedded" | "insecure">(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceId, setVoiceId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_VOICE_ID;
    return localStorage.getItem("delcio.voiceId") || DEFAULT_VOICE_ID;
  });
  const [ttsProvider, setTtsProvider] = useState<"elevenlabs" | "lovable">(() => {
    if (typeof window === "undefined") return "elevenlabs";
    return (localStorage.getItem("delcio.ttsProvider") as "elevenlabs" | "lovable") || "elevenlabs";
  });
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);




  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [turns, setTurns] = useState(0); // for progress
  const online = useOnlineStatus();
  const isMobile = useIsMobile();




  const [celebration, setCelebration] = useState<{
    show: boolean;
    message: string;
    type: "level" | "session";
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLevelRef = useRef(-1);
  const prevTurnsRef = useRef(-1);

  // History sent to API (excluding corrections/translations meta)
  const apiHistory = useMemo(
    () =>
      bubbles
        .filter((b) => b.kind === "bot" || b.kind === "user")
        .map((b) => ({
          role: b.kind === "bot" ? ("assistant" as const) : ("user" as const),
          content: b.text,
        })),
    [bubbles]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, loading]);

  const levelIndex = Math.min(Math.floor(score / 80), LEVELS.length - 1);
  const level = LEVELS[levelIndex];
  const nextLevel = levelIndex < LEVELS.length - 1 ? LEVELS[levelIndex + 1] : null;
  const turnsInCycle = turns % 10;
  const progress = (turnsInCycle / 10) * 100;

  // Celebration effects
  useEffect(() => {
    if (stage !== "chat") {
      prevLevelRef.current = levelIndex;
      prevTurnsRef.current = turns;
      return;
    }

    const prevLevel = prevLevelRef.current;
    const prevTurnsVal = prevTurnsRef.current;

    prevLevelRef.current = levelIndex;
    prevTurnsRef.current = turns;

    if (prevLevel < 0) return; // first mount

    if (levelIndex > prevLevel) {
      setCelebration({ show: true, message: `🎉 Parabéns, ${name}! Você subiu para "${level}"!`, type: "level" });
      const t = setTimeout(() => {
        setCelebration((prev) => (prev ? { ...prev, show: false } : null));
      }, 4500);
      const t2 = setTimeout(() => {
        setCelebration(null);
      }, 5500);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }

    if (turns > 0 && turns % 10 === 0 && turns !== prevTurnsVal) {
      setCelebration({ show: true, message: `🎊 Muito bem, ${name}! Você completou 10 turnos de prática!`, type: "session" });
      const t = setTimeout(() => {
        setCelebration((prev) => (prev ? { ...prev, show: false } : null));
      }, 4500);
      const t2 = setTimeout(() => {
        setCelebration(null);
      }, 5500);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [levelIndex, level, turns, name, stage]);

  // Confetti config
  const confetti = useMemo(() => {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF69B4"];
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, [celebration?.show]);

  async function speak(text: string, overrideVoiceId?: string) {
    if (typeof window === "undefined") return;
    const cleaned = text.replace(/[🇺🇸🇧🇷✏️🌐🎉🎊⚠️]/g, "").trim();
    if (!cleaned) return;
    try {
      // Cancel any pending speech
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const res = await fetchWithRetry("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned, voiceId: overrideVoiceId || voiceId, provider: ttsProvider }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;
      setCurrentAudio(audio);
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      // Fallback to browser speech synthesis
      try {
        if (!("speechSynthesis" in window)) return;
        const utter = new SpeechSynthesisUtterance(cleaned);
        utter.lang = learningLang === "en" ? "en-US" : "pt-BR";
        utter.rate = 0.95;
        utter.pitch = 1.1;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch {
        /* ignore */
      }
    }
  }

  async function previewVoice(id: string) {
    if (previewingVoice) return;
    setPreviewingVoice(id);
    const sample =
      learningLang === "en"
        ? "Hello! I'm your English teacher. Let's practice together!"
        : "Olá! Sou seu professor. Vamos praticar juntos!";
    try {
      const res = await fetchWithRetry("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sample, voiceId: id, provider: ttsProvider }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setPreviewingVoice(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPreviewingVoice(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setPreviewingVoice(null);
    }
  }

  function selectVoice(id: string) {
    setVoiceId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("delcio.voiceId", id);
    }
  }

  function selectProvider(p: "elevenlabs" | "lovable") {
    setTtsProvider(p);
    if (typeof window !== "undefined") {
      localStorage.setItem("delcio.ttsProvider", p);
    }
  }




  // Reactive level from microphone while recording
  useEffect(() => {
    if (!recording) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let owned = false;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        // Reutiliza o stream do gravador (telemóvel) para não disputar o microfone.
        if (micStreamRef.current) {
          stream = micStreamRef.current;
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          owned = true;
        }
        if (cancelled) {
          if (owned) stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const Ctx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setVoiceLevel(Math.min(1, rms * 3.2));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* mic denied */
      }
    })();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (owned) stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      setVoiceLevel(0);
    };
  }, [recording]);


  // Synthetic level while TTS is speaking or while loading
  useEffect(() => {
    if (recording) return;
    if (!speaking && !loading) return;
    let raf = 0;
    const start = performance.now();
    const amp = speaking ? 1 : 0.35;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const wave =
        0.45 +
        0.28 * Math.sin(t * 7.3) +
        0.18 * Math.sin(t * 13.7 + 1.2) +
        0.1 * Math.sin(t * 21.1 + 0.7);
      const noise = (Math.random() - 0.5) * 0.12;
      const v = Math.max(0.06, Math.min(1, Math.abs(wave) + noise)) * amp;
      setVoiceLevel(v);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      setVoiceLevel(0);
    };
  }, [speaking, loading, recording]);


  async function callApi(payload: any) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Sem ligação à internet.");
    }
    const res = await fetchWithRetry(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      {
        onRetry: ({ reason }) => {
          if (reason === "key_rotated") console.info("[chat] a reconectar ao servidor…");
        },
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error("Muitas requisições — aguarde um momento.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos.");
      if (data?.error === "key_rotated")
        throw new Error("Servidor a atualizar credenciais. Tente novamente em instantes.");
      throw new Error(data?.error || "Erro ao falar com o Delcio.");
    }
    return (await res.json()) as { content: string };
  }

  async function start() {
    if (!name.trim()) return;
    setStage("chat");
    setLoading(true);
    try {
      const seedUser = {
        role: "user" as const,
        content:
          learningLang === "en"
            ? `Hi! My name is ${name}. I'm a beginner. Please greet me and ask a simple question.`
            : `Oi! Meu nome é ${name}. Sou iniciante. Por favor me cumprimente e me faça uma pergunta simples.`,
      };
      const { content } = await callApi({
        messages: [seedUser],
        userName: name,
        learningLang,
      });
      const { clean } = stripScore(content);
      const { correction, rest } = splitCorrection(clean);
      const newBubbles: Bubble[] = [];
      if (correction)
        newBubbles.push({ id: uid(), kind: "correction", text: correction });
      newBubbles.push({ id: uid(), kind: "bot", text: rest, voiceId });
      setBubbles(newBubbles);
      speak(correction ? `${correction}. ${rest}` : rest);
    } catch (e: any) {
      setBubbles([{ id: uid(), kind: "bot", text: `⚠️ ${e.message}`, voiceId }]);
    } finally {
      setLoading(false);
    }
  }

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const userBubble: Bubble = { id: uid(), kind: "user", text };
    const nextBubbles = [...bubbles, userBubble];
    setBubbles(nextBubbles);
    setLoading(true);
    try {
      const history = [
        ...apiHistory,
        { role: "user" as const, content: text },
      ];
      const { content } = await callApi({
        messages: history,
        userName: name,
        learningLang,
        voiceMode: mode === "voice",
      });
      const { clean, correct } = stripScore(content);
      const { correction, rest } = splitCorrection(clean);

      setBubbles((prev) => {
        const out = [...prev];
        if (correction) out.push({ id: uid(), kind: "correction", text: correction });
        out.push({ id: uid(), kind: "bot", text: rest, voiceId });
        return out;
      });

      setTurns((t) => t + 1);
      if (correct === true) {
        setScore((s) => s + 10);
        setStreak((s) => s + 1);
      } else if (correct === false) {
        setStreak(0);
      }
      speak(correction ? `${correction}. ${rest}` : rest);
    } catch (e: any) {
      setBubbles((prev) => [...prev, { id: uid(), kind: "bot", text: `⚠️ ${e.message}`, voiceId }]);
    } finally {
      setLoading(false);
    }
  }

  async function transcribeBlob(blob: Blob, mime: string) {
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "mp4",
      "audio/aac": "aac",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
    };
    const ext = extMap[mime.split(";")[0]] ?? "webm";
    const fd = new FormData();
    fd.append("file", blob, `recording.${ext}`);
    fd.append("language", learningLang === "en" ? "en" : "pt");
    setLoading(true);
    try {
      const res = await fetchWithRetry("/api/stt", { method: "POST", body: fd }, { timeoutMs: 45_000 });
      if (!res.ok) throw new Error("stt");
      const data = (await res.json()) as { text?: string };
      const text = (data.text || "").trim();
      setLoading(false);
      if (!text) {
        setBubbles((prev) => [
          ...prev,
          { id: uid(), kind: "bot", text: "⚠️ Não consegui ouvir. Tenta falar mais perto do microfone.", voiceId },
        ]);
        return;
      }
      send(text);
    } catch {
      setLoading(false);
      setBubbles((prev) => [
        ...prev,
        { id: uid(), kind: "bot", text: "⚠️ Não consegui transcrever o áudio. Tenta novamente.", voiceId },
      ]);
    }
  }

  function micNotice(text: string) {
    setBubbles((prev) => [...prev, { id: uid(), kind: "bot", text, voiceId }]);
  }

  async function startRecorder() {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      setMicHelp("insecure");
      return;
    }
    if (window.self !== window.top) {
      setMicHelp("embedded");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof (window as any).MediaRecorder === "undefined") {
      micNotice("⚠️ Este navegador não permite gravar áudio. Tenta o Chrome ou o Safari atualizados.");
      return;
    }
    try {
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (permission.state === "denied") {
            setMicHelp("blocked");
            return;
          }
        } catch {
          // Alguns navegadores não expõem a permissão do microfone nesta API.
        }
      }
      setMicHelp("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setMicHelp(null);
      micStreamRef.current = stream;
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
      const mime =
        candidates.find((t) => (window as any).MediaRecorder.isTypeSupported?.(t)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        mediaRecorderRef.current = null;
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (blob.size < 1500) {
          micNotice("⚠️ Gravação demasiado curta. Mantém o botão até acabares de falar.");
          return;
        }
        transcribeBlob(blob, type);
      };
      mediaRecorderRef.current = rec;
      // Intervalos pequenos evitam gravações vazias em algumas versões do Chrome Android.
      rec.start(250);
      setRecording(true);
    } catch (err: any) {
      setRecording(false);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMicHelp("blocked");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        micNotice("⚠️ Não encontrei nenhum microfone neste dispositivo.");
      } else if (name === "NotReadableError") {
        micNotice("⚠️ O microfone está a ser usado por outra app. Fecha-a e tenta de novo.");
      } else {
        micNotice("⚠️ Não consegui aceder ao microfone. Tenta novamente.");
      }
    }
  }


  function toggleMic() {
    if (typeof window === "undefined") return;
    if (recording) {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* ignore */
        }
      } else {
        try {
          recognitionRef.current?.stop();
        } catch {
          /* ignore */
        }
      }
      setRecording(false);
      return;
    }

    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // No telemóvel o reconhecimento nativo é pouco fiável — grava e transcreve no servidor.
    if (!SR || isMobile) {
      startRecorder();
      return;
    }

    const rec = new SR();
    rec.lang = learningLang === "en" ? "en-US" : "pt-BR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let got = false;
    rec.onresult = (e: any) => {
      got = true;
      const transcript = e.results[0][0].transcript;
      setRecording(false);
      send(transcript);
    };
    rec.onerror = () => {
      setRecording(false);
      if (!got) startRecorder();
    };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      startRecorder();
    }
  }


  async function translateLast() {
    const lastBot = [...bubbles].reverse().find((b) => b.kind === "bot") as
      | Extract<Bubble, { kind: "bot" }>
      | undefined;
    if (!lastBot || loading) return;
    if (lastBot.translation) return;
    setLoading(true);
    try {
      const { content } = await callApi({
        mode: "translate",
        textToTranslate: lastBot.text,
        learningLang,
      });
      setBubbles((prev) =>
        prev.map((b) =>
          b.id === lastBot.id && b.kind === "bot" ? { ...b, translation: content } : b
        )
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setBubbles([]);
    setScore(0);
    setStreak(0);
    setTurns(0);
    setInput("");
    setCelebration(null);
    prevLevelRef.current = -1;
    prevTurnsRef.current = -1;
    setStage("welcome");
  }

  if (stage === "welcome") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-secondary to-accent">
        <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl p-6 sm:p-8 border border-border bubble-in">
          <div className="flex justify-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-md bg-primary/10 text-primary-dark font-bold text-sm tracking-wide border border-primary/30">POR</span>
            <span className="px-3 py-1 rounded-md bg-primary/10 text-primary-dark font-bold text-sm tracking-wide border border-primary/30">ENG</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary-dark">
            Delcio-English <span className="text-primary">🌍</span>
            <span className="block text-base font-medium text-muted-foreground mt-1">
              Aprenda inglês conversando com IA
            </span>
          </h1>
          <p className="text-center text-muted-foreground mt-2 mb-6">
            Aprenda conversando com o seu professor virtual.
          </p>

          <label htmlFor="learner-name" className="block text-sm font-medium mb-1">
            Como você se chama? / What's your name?
          </label>
          <input
            id="learner-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && start()}
          />

          <p className="text-sm font-medium mb-2">O que você quer aprender?</p>
          <div className="grid grid-cols-1 gap-2 mb-6">
            <button
              onClick={() => setLearningLang("en")}
              className={`text-left rounded-lg border px-4 py-3 transition ${
                learningLang === "en"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className="inline-block min-w-[2.5rem] text-center px-2 py-0.5 mr-2 rounded bg-primary/10 text-primary-dark font-bold text-xs">ENG</span>
              Aprendo <b>Inglês</b> (falo português)
            </button>
            <button
              onClick={() => setLearningLang("pt")}
              className={`text-left rounded-lg border px-4 py-3 transition ${
                learningLang === "pt"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className="inline-block min-w-[2.5rem] text-center px-2 py-0.5 mr-2 rounded bg-primary/10 text-primary-dark font-bold text-xs">POR</span>
              I'm learning <b>Portuguese</b> (I speak English)
            </button>
          </div>

          <button
            onClick={start}
            disabled={!name.trim()}
            className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 hover:opacity-90 disabled:opacity-50 transition"
          >
            Começar / Let's Go! 🚀
          </button>
        </div>
      </main>
    );
  }

  const lastUser = [...bubbles].reverse().find((b) => b.kind === "user") as
    | Extract<Bubble, { kind: "user" }>
    | undefined;
  const lastBot = [...bubbles].reverse().find((b) => b.kind === "bot") as
    | Extract<Bubble, { kind: "bot" }>
    | undefined;

  return (
    <main className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-primary-dark text-primary-foreground px-3 sm:px-4 py-2.5 sm:py-3 shadow-md pt-[max(0.625rem,env(safe-area-inset-top))]">
        <div className="max-w-3xl mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-base sm:text-xl font-bold">Delcio-English</span>
            <span className="shrink-0 text-base sm:text-xl">🌍</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] sm:text-[11px] font-medium border ${
                online
                  ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-100"
                  : "bg-amber-500/20 border-amber-300/40 text-amber-100"
              }`}
              title={online ? "Conectado" : "Sem internet — a IA não responde offline"}
            >
              {online ? "●" : "●"}
              <span className="hidden sm:inline"> {online ? "Online" : "Offline"}</span>
            </span>
            <span className="max-w-[7ch] sm:max-w-none truncate bg-white/10 rounded-full px-2 sm:px-3 py-1">
              👤 {name}
            </span>
            <span className="shrink-0 bg-white/10 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> {score}
            </span>
            <span className="shrink-0 bg-white/10 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {streak}
            </span>
            <Link
              to="/about"
              className="shrink-0 bg-white/10 hover:bg-white/20 transition rounded-full px-2 sm:px-3 py-1 text-[11px] sm:text-[12px] font-medium"
            >
              Sobre
            </Link>
          </div>

        </div>

        <div className="max-w-3xl mx-auto mt-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span className="opacity-80">Nível:</span>
              <span className="font-semibold">{level}</span>
            </div>
            <div className="flex items-center gap-1.5" aria-label={`Nível ${levelIndex + 1} de ${LEVELS.length}`}>
              {LEVELS.map((l, i) => (
                <span
                  key={l}
                  title={l}
                  className={`h-2 rounded-full transition-all ${
                    i < levelIndex
                      ? "w-4 bg-correction/70"
                      : i === levelIndex
                        ? "w-6 bg-correction"
                        : "w-4 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] opacity-80">
            <span>Progresso da sessão</span>
            <span>{turnsInCycle} / 10 turnos</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1 h-2 bg-white/15 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-correction transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextLevel && (
            <div className="mt-1.5 text-[11px] opacity-70">
              Próximo: <span className="font-medium opacity-100">{nextLevel}</span>
            </div>
          )}
        </div>
      </header>

      {/* Celebration overlay */}
      {celebration?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in-overlay" />
          <div className="absolute inset-0 overflow-hidden">
            {confetti.map((c) => (
              <div
                key={c.id}
                className="absolute top-0 confetti-fall"
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                }}
              >
                <div
                  style={{
                    width: c.size,
                    height: c.size * 0.6,
                    backgroundColor: c.color,
                    borderRadius: 2,
                    transform: `rotate(${c.rotation}deg)`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 animate-celebration-pop text-center px-6">
            {celebration.type === "level" ? (
              <Crown className="w-14 h-14 text-yellow-400 drop-shadow" />
            ) : (
              <PartyPopper className="w-14 h-14 text-yellow-400 drop-shadow" />
            )}
            <div className="bg-card/95 backdrop-blur rounded-2xl border border-border px-6 py-5 shadow-2xl max-w-sm">
              <p className="text-lg font-bold text-primary-dark">{celebration.message}</p>
              <div className="mt-3 flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-correction animate-star-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {bubbles.map((b) => {
            if (b.kind === "user") {
              return (
                <div key={b.id} className="flex justify-end bubble-in">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-user-bubble text-user-bubble-foreground px-4 py-2.5 shadow">
                    {b.text}
                  </div>
                </div>
              );
            }
            if (b.kind === "correction") {
              return (
                <div key={b.id} className="flex justify-start bubble-in">
                  <div className="max-w-[85%] rounded-2xl bg-correction text-correction-foreground px-4 py-2.5 shadow border border-amber-300/50">
                    <div className="text-xs font-semibold mb-1">✏️ Correção</div>
                    <div className="text-sm">{b.text}</div>
                  </div>
                </div>
              );
            }
            const botVoice = getVoice(b.voiceId || voiceId);
            return (
              <div key={b.id} className="flex justify-start bubble-in items-end gap-2">
                <img
                  src={botVoice.avatar}
                  alt={botVoice.name}
                  loading="lazy"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                />
                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  <div className="rounded-2xl rounded-bl-sm bg-bot-bubble text-bot-bubble-foreground px-4 py-2.5 shadow whitespace-pre-line">
                    {b.text}
                  </div>
                  {b.translation && (
                    <div className="rounded-2xl bg-translation text-translation-foreground px-4 py-2 italic text-sm shadow border border-blue-200/50">
                      🌐 {b.translation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-bot-bubble/80 text-bot-bubble-foreground px-4 py-2.5 shadow">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-3 py-2.5 sm:py-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 text-xs">

            <button
              onClick={() => setMode("text")}
              className={`rounded-full px-3 py-1 border ${
                mode === "text"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border"
              }`}
            >
              Modo Texto ✍️
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`rounded-full px-3 py-1 border ${
                mode === "voice"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border"
              }`}
            >
              Modo Voz 🎙️
            </button>
            <div className="hidden sm:block flex-1" />
            <div className="relative">
              <button
                onClick={() => setShowVoicePicker((v) => !v)}
                className="rounded-full pl-1 pr-3 py-0.5 border border-border hover:bg-secondary flex items-center gap-1.5"
                title="Escolher voz do professor"
              >
                <img
                  src={getVoice(voiceId).avatar}
                  alt={getVoice(voiceId).name}
                  width={24}
                  height={24}
                  loading="lazy"
                  className="w-6 h-6 rounded-full object-cover border border-border"
                />
                <span>{getVoice(voiceId).name}</span>
              </button>
              {showVoicePicker && mode === "text" && (
                <div className="absolute bottom-full right-0 mb-2 z-30 bg-card border border-border rounded-2xl p-3 w-[min(280px,calc(100vw-1.5rem))] max-h-[55vh] overflow-y-auto shadow-2xl">
                  <p className="text-xs text-muted-foreground mb-2 px-1">Motor de voz</p>
                  <div className="flex gap-1 mb-3">
                    <button
                      onClick={() => selectProvider("elevenlabs")}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] border transition ${
                        ttsProvider === "elevenlabs"
                          ? "bg-primary/15 border-primary/60 font-medium"
                          : "bg-secondary/40 border-border hover:bg-secondary"
                      }`}
                    >
                      ElevenLabs
                      <span className="block text-[10px] opacity-60">mais realista</span>
                    </button>
                    <button
                      onClick={() => selectProvider("lovable")}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] border transition ${
                        ttsProvider === "lovable"
                          ? "bg-primary/15 border-primary/60 font-medium"
                          : "bg-secondary/40 border-border hover:bg-secondary"
                      }`}
                    >
                      Padrão
                      <span className="block text-[10px] opacity-60">sempre disponível</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 px-1">Escolha a voz do seu professor</p>
                  <div className="flex flex-col gap-1">
                    {VOICES.map((v) => {
                      const active = v.id === voiceId;
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-2 border transition ${
                            active ? "bg-primary/15 border-primary/60" : "bg-secondary/40 border-border hover:bg-secondary"
                          }`}
                        >
                          <img
                            src={v.avatar}
                            alt={v.name}
                            width={40}
                            height={40}
                            loading="lazy"
                            className={`w-10 h-10 rounded-full object-cover shrink-0 border-2 ${active ? "border-primary" : "border-transparent"}`}
                          />
                          <button onClick={() => selectVoice(v.id)} className="flex-1 text-left">
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              {v.name}
                              <span className="text-[10px] opacity-60">{v.gender === "f" ? "♀" : "♂"}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground leading-tight">{v.description}</div>
                          </button>
                          <button
                            onClick={() => previewVoice(v.id)}
                            disabled={previewingVoice !== null}
                            className="shrink-0 rounded-full w-8 h-8 flex items-center justify-center bg-primary/10 hover:bg-primary/20 disabled:opacity-40"
                            title="Ouvir amostra"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={translateLast}
              disabled={loading}
              className="rounded-full px-3 py-1 border border-border hover:bg-secondary flex items-center gap-1 disabled:opacity-50"
              title="Traduzir última mensagem"
            >
              <Languages className="w-3.5 h-3.5" /> Traduzir
            </button>
            <button
              onClick={restart}
              className="rounded-full px-3 py-1 border border-border hover:bg-secondary flex items-center gap-1"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Recomeçar
            </button>
          </div>


          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              className={`shrink-0 rounded-full w-11 h-11 flex items-center justify-center border ${
                recording
                  ? "bg-destructive text-destructive-foreground border-destructive mic-recording"
                  : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
              }`}
              aria-label="Microfone"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={
                learningLang === "en"
                  ? "Type in English… (ou em português)"
                  : "Digite em português… (or in English)"
              }
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-full w-11 h-11 flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modo Voz — overlay tela cheia estilo Blackbox */}
      {mode === "voice" && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col animate-fade-in-overlay">
          <button
            onClick={() => {
              if (recording) recognitionRef.current?.stop();
              if (audioRef.current) audioRef.current.pause();
              if (typeof window !== "undefined") window.speechSynthesis?.cancel();
              setMode("text");
              setShowVoicePicker(false);
            }}
            aria-label="Fechar modo voz"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white/90 z-10"
          >
            ✕
          </button>

          {/* Botão de trocar voz */}
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setShowVoicePicker((v) => !v)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-full px-3 py-2 border border-white/20 flex items-center gap-2"
              aria-label="Trocar voz"
              title="Trocar voz"
            >
              <Volume2 className="w-4 h-4" />
              <span>Trocar voz</span>
            </button>
          </div>

          {showVoicePicker && (
            <div className="absolute top-16 left-3 right-3 sm:right-auto z-20 bg-neutral-900/95 backdrop-blur border border-white/15 rounded-2xl p-3 sm:w-[280px] max-h-[60vh] overflow-y-auto shadow-2xl">
              <p className="text-xs text-white/60 mb-2 px-1">Motor de voz</p>
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => selectProvider("elevenlabs")}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] border transition ${
                    ttsProvider === "elevenlabs"
                      ? "bg-white/20 border-white/50 font-medium"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  ElevenLabs
                  <span className="block text-[10px] opacity-60">mais realista</span>
                </button>
                <button
                  onClick={() => selectProvider("lovable")}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] border transition ${
                    ttsProvider === "lovable"
                      ? "bg-white/20 border-white/50 font-medium"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  Padrão
                  <span className="block text-[10px] opacity-60">sempre disponível</span>
                </button>
              </div>
              <p className="text-xs text-white/60 mb-2 px-1">Escolha a voz do seu professor</p>
              <div className="flex flex-col gap-1">
                {VOICES.map((v) => {
                  const active = v.id === voiceId;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center gap-2 rounded-xl px-2.5 py-2 border transition ${
                        active
                          ? "bg-primary/25 border-primary/60"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <img
                        src={v.avatar}
                        alt={v.name}
                        width={40}
                        height={40}
                        loading="lazy"
                        className={`w-10 h-10 rounded-full object-cover shrink-0 border-2 ${active ? "border-primary" : "border-white/10"}`}
                      />
                      <button
                        onClick={() => selectVoice(v.id)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-medium text-white flex items-center gap-1.5">
                          {v.name}
                          <span className="text-[10px] opacity-60">{v.gender === "f" ? "♀" : "♂"}</span>
                        </div>
                        <div className="text-[11px] text-white/60 leading-tight">{v.description}</div>
                      </button>
                      <button
                        onClick={() => previewVoice(v.id)}
                        disabled={previewingVoice !== null}
                        className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-40"
                        aria-label={`Ouvir ${v.name}`}
                        title="Ouvir amostra"
                      >
                        {previewingVoice === v.id ? (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}





          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 sm:px-6 gap-5 sm:gap-8 pt-16 sm:pt-20">

            <div className="text-center text-xs sm:text-sm uppercase tracking-[0.2em] text-white/60 min-h-[20px]">
              {loading
                ? "A pensar…"
                : speaking
                  ? "A responder…"
                  : recording
                    ? "A ouvir…"
                    : "Toque para falar"}
            </div>

            {/* Avatar a falar (lip-sync) */}
            <SpeakingAvatar
              avatar={getVoice(voiceId).avatar}
              name={getVoice(voiceId).name}
              audio={currentAudio}
              speaking={speaking}
              size={isMobile ? 200 : 280}
            />

            {/* Waveform reativa */}
            <Waveform level={voiceLevel} active={recording || speaking || loading} />



            {/* Última troca */}
            <div className="w-full max-w-md text-center space-y-2 min-h-[60px]">
              {lastUser && (
                <p className="text-white/70 text-sm">
                  <span className="text-white/40">Você: </span>
                  {lastUser.text}
                </p>
              )}
              {lastBot && (
                <p className="text-white text-base font-medium leading-snug">
                  {lastBot.text}
                </p>
              )}
            </div>
          </div>


          {/* Botão microfone */}
          <div className="pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-12 sm:pt-4 flex flex-col items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleMic}
              disabled={loading}
              aria-label={recording ? "Parar gravação" : "Falar"}
              className={`w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition shadow-2xl ${
                recording
                  ? "bg-destructive text-destructive-foreground mic-recording"
                  : "bg-primary text-primary-foreground hover:brightness-110 active:scale-95 disabled:opacity-50"
              }`}
            >
              <Mic className="w-9 h-9" />
            </button>
            <p className="text-xs text-white/40">
              {recording ? "Toque para parar" : "Toque no microfone"}
            </p>
          </div>
        </div>
      )}

      {micHelp && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card text-card-foreground p-5 shadow-xl space-y-3">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" /> Ativar o microfone
            </h2>
            {micHelp === "insecure" && (
              <p className="text-sm text-muted-foreground">
                O microfone só funciona em ligações seguras (https). Abre o site publicado em https.
              </p>
            )}
            {micHelp === "embedded" && (
              <p className="text-sm text-muted-foreground">
                Estás dentro da pré-visualização, onde o microfone é bloqueado. Abre o app numa aba própria para falar.
              </p>
            )}
            {micHelp === "blocked" && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>O Chrome bloqueou o microfone para este site.</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Toca no ícone de controlos à esquerda do endereço (não é um cadeado).</li>
                  <li>Abre <b>Permissões</b> → <b>Microfone</b> → <b>Permitir</b>.</li>
                  <li>Atualiza esta página e toca novamente no microfone.</li>
                </ol>
                <p>Depois de permitir, toca em “Tentar novamente”.</p>
              </div>
            )}
            {micHelp === "requesting" && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-card-foreground">À espera da autorização do Chrome…</p>
                <p>Procura a pergunta “Permitir que este site use o microfone?” e toca em <b>Permitir</b>.</p>
                <p>Se a pergunta não aparecer, fecha este aviso e toca novamente no microfone.</p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {micHelp !== "blocked" && (
                <button
                  className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
                  onClick={() => {
                    setMicHelp(null);
                    window.open("https://delcio-english.lovable.app", "_blank", "noopener");
                  }}
                >
                  Abrir o app numa aba nova
                </button>
              )}
              {micHelp !== "requesting" && (
                <button
                  className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"
                  onClick={() => void startRecorder()}
                >
                  Tentar novamente
                </button>
              )}
              <button
                className="w-full rounded-xl border border-border py-2.5 text-sm"
                onClick={() => setMicHelp(null)}
              >
                {micHelp === "requesting" ? "Fechar aviso" : "Escrever em vez de falar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>

  );
}

function Waveform({ level, active }: { level: number; active: boolean }) {
  const N = 32;
  return (
    <div className="flex items-end justify-center gap-[3px] h-16">
      {Array.from({ length: N }).map((_, i) => {
        const center = (N - 1) / 2;
        const bell = 1 - Math.abs(i - center) / center;
        const wobble = 0.55 + 0.45 * Math.sin(i * 0.85 + level * 22 + i);
        const h = active
          ? Math.max(4, (6 + level * 58) * (0.35 + bell * 0.65) * wobble)
          : 4;
        return (
          <div
            key={i}
            className="w-[3px] rounded-full bg-primary"
            style={{
              height: h,
              opacity: active ? 0.6 + level * 0.4 : 0.35,
              transition: "height 70ms linear, opacity 120ms linear",
            }}
          />
        );
      })}
    </div>
  );
}

