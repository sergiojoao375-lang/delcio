import { createFileRoute } from "@tanstack/react-router";
import { isValidVoiceId, DEFAULT_VOICE_ID, getVoice } from "@/lib/voices";

// Mapeia as vozes ElevenLabs para vozes equivalentes do fallback (Lovable AI)
const FALLBACK_VOICE: Record<string, string> = {
  EXAVITQu4vr4xnSDxMaL: "shimmer",
  FGY2WhTYpPnrIDTdsKH5: "nova",
  pFZP5JQG7iQjIQuC4Bku: "coral",
  XrExE9yKIg1WjnnlVkGX: "sage",
  cgSgspJ2msm6clMCkdW9: "alloy",
  IKne3meq5aSn9XLyUdCD: "echo",
  JBFqnCBsd6RMkjVDRZzb: "onyx",
  TX3LPaxmHKxFdv7VOQHJ: "fable",
  nPczCjzI2devNBz1zQrb: "ash",
};

async function lovableTts(text: string, voiceId: string, reqId: string): Promise<Response> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "Serviço de voz indisponível." }), {
      status: 502,
      headers: { "Content-Type": "application/json", "X-Backend-Request-Id": reqId },
    });
  }
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice: FALLBACK_VOICE[voiceId] ?? "alloy",
      response_format: "mp3",
      instructions: `Speak as ${getVoice(voiceId).name}: warm, friendly and clear, like a language teacher.`,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error(JSON.stringify({ scope: "tts-fallback", requestId: reqId, upstreamStatus: resp.status, message: err.slice(0, 300) }));
    return new Response(JSON.stringify({ error: "Serviço de voz indisponível no momento." }), {
      status: 502,
      headers: { "Content-Type": "application/json", "X-Backend-Request-Id": reqId },
    });
  }
  return new Response(await resp.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Backend-Request-Id": reqId,
      "X-TTS-Provider": "lovable",
    },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;


        let body: { text?: string; voiceId?: string; provider?: string };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text || text.length > 2000) {
          return new Response(JSON.stringify({ error: "Invalid text" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const voiceId = body.voiceId && isValidVoiceId(body.voiceId) ? body.voiceId : DEFAULT_VOICE_ID;
        const reqId = request.headers.get("X-Client-Request-Id") || "";

        // O utilizador pode escolher o motor de voz
        if (!apiKey || body.provider === "lovable") {
          return lovableTts(text, voiceId, reqId);
        }

        const resp = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.4,
                use_speaker_boost: true,
                speed: 1.0,
              },
            }),
          }
        );

        if (!resp.ok) {
          const err = await resp.text();
          console.error(
            JSON.stringify({ scope: "tts", requestId: reqId, upstreamStatus: resp.status, message: err.slice(0, 300) })
          );
          // Quota, auth ou erro do ElevenLabs -> usa o TTS da Lovable AI
          return lovableTts(text, voiceId, reqId);
        }


        const audio = await resp.arrayBuffer();
        return new Response(audio, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-Backend-Request-Id": reqId,
          },
        });
      },
    },
  },
});
