import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const reqId = request.headers.get("X-Client-Request-Id") || "";
        const headers = { "Content-Type": "application/json", "X-Backend-Request-Id": reqId };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "stt_unavailable" }), { status: 500, headers });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_form" }), { status: 400, headers });
        }
        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return new Response(JSON.stringify({ error: "missing_audio" }), { status: 400, headers });
        }
        if (file.size > 20 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "audio_too_large" }), { status: 413, headers });
        }
        const language = typeof form.get("language") === "string" ? String(form.get("language")) : "";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, file.name || "recording.webm");
        if (language) upstream.append("language", language);

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error(
            JSON.stringify({ scope: "stt", requestId: reqId, upstreamStatus: resp.status, message: text.slice(0, 300) })
          );
          if (resp.status === 401 || resp.status === 403)
            return new Response(JSON.stringify({ error: "key_rotated", retryable: true }), { status: 503, headers });
          return new Response(JSON.stringify({ error: "stt_failed" }), { status: resp.status, headers });
        }

        const data = (await resp.json()) as { text?: string };
        return new Response(JSON.stringify({ text: data.text ?? "" }), { status: 200, headers });
      },
    },
  },
});
