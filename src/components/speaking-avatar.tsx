import { useEffect, useRef, useState } from "react";

type Props = {
  avatar?: string;
  name: string;
  audio: HTMLAudioElement | null;
  speaking: boolean;
  size?: number;
};

let audioCtx: AudioContext | null = null;
const connected = new WeakMap<HTMLMediaElement, { analyser: AnalyserNode }>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function attach(el: HTMLMediaElement): AnalyserNode | null {
  const ctx = getCtx();
  if (!ctx) return null;
  const existing = connected.get(el);
  if (existing) return existing.analyser;
  try {
    const source = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    connected.set(el, { analyser });
    return analyser;
  } catch {
    return null;
  }
}

/**
 * AI Presence — an abstract, elegant visualization for conversing with the AI.
 * Reactive to voice: core sphere pulses, aurora rings expand, particles drift.
 */
export function SpeakingAvatar({ name, audio, speaking, size = 320 }: Props) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audio || !speaking) {
      setLevel(0);
      return;
    }
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    const analyser = attach(audio);
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      const rms = Math.sqrt(sum / data.length);
      analyser.getByteFrequencyData(spectrum);
      let voiceEnergy = 0;
      const voiceBins = Math.min(spectrum.length, 180);
      for (let i = 3; i < voiceBins; i++) voiceEnergy += spectrum[i];
      voiceEnergy /= Math.max(1, voiceBins - 3) * 255;

      // A light noise gate keeps silence calm; the curved gain makes soft
      // syllables visible while preserving headroom for louder words.
      const signal = Math.max(0, rms - 0.006) * 7.5;
      const detail = voiceEnergy * 1.15 + peak * 0.35;
      const target = Math.min(1, Math.pow(Math.max(signal, detail), 0.68));
      setLevel((prev) => {
        const response = target > prev ? 0.72 : 0.2;
        const next = prev + (target - prev) * response;
        return next < 0.018 ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setLevel(0);
    };
  }, [audio, speaking]);

  const l = level;
  const core = size * 0.42;
  const ring1 = size * 0.72;
  const ring2 = size * 0.9;
  const ring3 = size * 1.08;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Ambient outer glow */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size * 1.6,
          height: size * 1.6,
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent) 0%, transparent 65%)",
          opacity: 0.28 + l * 0.65,
          filter: `blur(${20 + l * 10}px)`,
          transform: `scale(${1 + l * 0.2})`,
          transition: "opacity 55ms linear, transform 55ms linear, filter 55ms linear",
        }}
      />

      {/* Rotating aurora rings */}
      <div
        aria-hidden
        className="absolute rounded-full ai-ring-spin-slow"
        style={{
          width: ring3,
          height: ring3,
          background:
            "conic-gradient(from 0deg, transparent 0%, color-mix(in oklab, var(--primary) 55%, #7de1ff 45%) 20%, transparent 40%, color-mix(in oklab, var(--primary) 65%, #b6f3d6 30%) 65%, transparent 85%)",
          maskImage:
            "radial-gradient(circle, transparent 46%, black 48%, black 50%, transparent 52%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 46%, black 48%, black 50%, transparent 52%)",
          opacity: 0.7,
          transform: `scale(${1 + l * 0.16})`,
          filter: `brightness(${1 + l * 0.55})`,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full ai-ring-spin-rev"
        style={{
          width: ring2,
          height: ring2,
          background:
            "conic-gradient(from 90deg, transparent 0%, color-mix(in oklab, var(--primary) 80%, white 10%) 25%, transparent 55%, color-mix(in oklab, var(--primary) 50%, #a5f3fc 50%) 80%, transparent 100%)",
          maskImage:
            "radial-gradient(circle, transparent 45%, black 47%, black 50%, transparent 53%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 45%, black 47%, black 50%, transparent 53%)",
          opacity: 0.55,
          transform: `scale(${1 + l * 0.11})`,
          filter: `brightness(${1 + l * 0.45})`,
        }}
      />

      {/* Reactive pulse ring */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: ring1,
          height: ring1,
          border: "1px solid color-mix(in oklab, var(--primary) 60%, transparent)",
          transform: `scale(${1 + l * 0.3})`,
          opacity: 0.4 + l * 0.5,
          transition: "transform 55ms linear, opacity 55ms linear",
          boxShadow:
            "inset 0 0 40px color-mix(in oklab, var(--primary) 25%, transparent)",
        }}
      />

      {/* Voice-reactive pulse waves when speaking */}
      {speaking && (
        <>
          <span
            className="absolute rounded-full border border-primary/40 ai-wave"
            style={{ width: ring1, height: ring1, animationDelay: "0s" }}
          />
          <span
            className="absolute rounded-full border border-primary/30 ai-wave"
            style={{ width: ring1, height: ring1, animationDelay: "0.7s" }}
          />
        </>
      )}

      {/* Core orb — a soft nebula sphere */}
      <div
        className="relative rounded-full ai-core-breathe"
        style={{
          width: core,
          height: core,
          background: `
            radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 18%, transparent 35%),
            radial-gradient(circle at 65% 70%, color-mix(in oklab, var(--primary) 90%, #a5f3fc 10%) 0%, transparent 55%),
            radial-gradient(circle at 30% 80%, #6ee7d4 0%, transparent 50%),
            radial-gradient(circle at 70% 20%, #a5b4fc 0%, transparent 55%),
            radial-gradient(circle at center, color-mix(in oklab, var(--primary) 80%, #0ea5e9 20%) 0%, #0b3d2e 100%)
          `,
          boxShadow: `
            0 0 ${30 + l * 125}px ${4 + l * 28}px color-mix(in oklab, var(--primary) ${50 + l * 45}%, transparent),
            inset 0 0 40px rgba(255,255,255,0.15),
            inset -20px -30px 60px rgba(0,0,0,0.35)
          `,
          transform: `scale(${1 + l * 0.18})`,
          transition: "transform 55ms linear, box-shadow 55ms linear",
        }}
      >
        {/* Inner shimmer */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full ai-shimmer"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.18), transparent, rgba(255,255,255,0.12), transparent)",
            mixBlendMode: "screen",
            opacity: 0.5 + l * 0.5,
            transform: `rotate(${l * 22}deg) scale(${1 + l * 0.12})`,
            transition: "opacity 55ms linear, transform 55ms linear",
          }}
        />
        {/* Specular highlight */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "12%",
            left: "18%",
            width: "35%",
            height: "22%",
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
        />
      </div>

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = ring1 / 2 + 10 + (i % 3) * 8;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        return (
          <span
            key={i}
            aria-hidden
            className="absolute rounded-full ai-particle"
            style={{
              width: 4 + (i % 3),
              height: 4 + (i % 3),
              background:
                "color-mix(in oklab, var(--primary) 70%, white 30%)",
              boxShadow:
                "0 0 8px color-mix(in oklab, var(--primary) 80%, transparent)",
              transform: `translate(${x * (1 + l * 0.22)}px, ${y * (1 + l * 0.22)}px) scale(${1 + l * 0.65})`,
              opacity: 0.5 + l * 0.5,
              transition: "transform 55ms linear, opacity 55ms linear",
              animationDelay: `${i * 0.3}s`,
            }}
          />
        );
      })}

      <div className="absolute -bottom-12 left-0 right-0 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
          {speaking ? "A responder" : "Delcio AI"}
        </div>
        <div className="text-sm font-light text-white/80 mt-1">{name}</div>
      </div>
    </div>
  );
}
