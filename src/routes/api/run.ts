import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  languageId: z.number().int().positive(),
  code: z.string().max(100_000),
  stdin: z.string().max(50_000).default(""),
});

const b64e = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64d = (s?: string | null) => {
  if (!s) return "";
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["JUDGE0_API_KEY"];
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const { languageId, code, stdin } = parsed.data;
        const body = JSON.stringify({ language_id: languageId, source_code: b64e(code), stdin: b64e(stdin) });
        // Prefer the user's RapidAPI key (higher limits); fall back to the free public endpoint.
        const res = key
          ? await fetch(
              "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true&fields=*",
              {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-rapidapi-key": key,
                  "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
                },
                body,
              },
            )
          : await fetch("https://ce.judge0.com/submissions?base64_encoded=true&wait=true", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body,
            });
        const j = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
          return Response.json({ error: j.message || j.error || `Runner error (${res.status})` }, { status: res.status });
        }
        return Response.json({
          stdout: b64d(j.stdout),
          stderr: b64d(j.stderr),
          compileOutput: b64d(j.compile_output),
          message: b64d(j.message),
          status: j.status?.description ?? "Unknown",
          time: j.time,
          memory: j.memory,
        });
      },
    },
  },
});
