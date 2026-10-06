import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LANGUAGES } from "@/lib/languages";

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

// Judge0 language key -> Wandbox compiler (languages Wandbox supports)
const WANDBOX_COMPILER: Record<string, string> = {
  python: "cpython-3.14.0",
  javascript: "nodejs-20.17.0",
  typescript: "typescript-5.6.2",
  c: "gcc-13.2.0-c",
  cpp: "gcc-13.2.0",
  csharp: "dotnetcore-8.0.402",
  java: "openjdk-jdk-21+35",
  go: "go-1.23.2",
  rust: "rust-1.82.0",
  swift: "swift-6.0.1",
  ruby: "ruby-3.4.9",
  php: "php-8.3.12",
  scala: "scala-3.5.1",
  bash: "bash",
  sql: "sqlite-3.46.1",
  r: "r-4.4.1",
  lua: "lua-5.4.7",
  perl: "perl-5.44.0",
  haskell: "ghc-9.10.1",
  elixir: "elixir-1.17.3",
};

type RunResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  status: string;
  time?: string;
  memory?: number;
  provider?: string;
};

async function runOnJudge0(languageId: number, code: string, stdin: string, key?: string): Promise<RunResult> {
  const url = key
    ? "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true&fields=*"
    : "https://ce.judge0.com/submissions?base64_encoded=true&wait=true";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) {
    headers["x-rapidapi-key"] = key;
    headers["x-rapidapi-host"] = "judge0-ce.p.rapidapi.com";
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ language_id: languageId, source_code: b64e(code), stdin: b64e(stdin) }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.message || j.error || `Runner error (${res.status})`);
  return {
    stdout: b64d(j.stdout),
    stderr: b64d(j.stderr),
    compileOutput: b64d(j.compile_output),
    message: b64d(j.message),
    status: j.status?.description ?? "Unknown",
    time: j.time,
    memory: j.memory,
    provider: key ? "judge0" : "judge0-public",
  };
}

async function runOnWandbox(code: string, stdin: string, compiler: string): Promise<RunResult> {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      compiler,
      stdin,
      options: "",
      "compiler-option-raw": "",
      "runtime-option-raw": "",
      save: false,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.message || `Runner error (${res.status})`);
  const compileOut = [j.compiler_output, j.compiler_error].filter(Boolean).join("\n");
  const status = j.signal
    ? `Killed (signal ${j.signal})`
    : j.status && j.status !== 0
      ? `Exit code ${j.status}`
      : "Accepted";
  return {
    stdout: j.program_output ?? "",
    stderr: j.program_error ?? "",
    compileOutput: compileOut,
    message: j.program_message ?? "",
    status,
    provider: "wandbox",
  };
}

export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const { languageId, code, stdin } = parsed.data;
        const lang = LANGUAGES.find((l) => l.id === languageId);

        const providers: Array<() => Promise<RunResult>> = [];
        const key = process.env["JUDGE0_API_KEY"];
        if (key) providers.push(() => runOnJudge0(languageId, code, stdin, key));
        if (lang && WANDBOX_COMPILER[lang.key]) providers.push(() => runOnWandbox(code, stdin, WANDBOX_COMPILER[lang.key]));
        providers.push(() => runOnJudge0(languageId, code, stdin));

        const errors: string[] = [];
        for (const run of providers) {
          try {
            return Response.json(await run());
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
          }
        }
        return Response.json({ error: errors[errors.length - 1] || "All code runners are unavailable right now." }, { status: 502 });
      },
    },
  },
});
