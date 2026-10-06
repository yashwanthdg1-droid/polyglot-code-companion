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

// Judge0 language id -> Piston language name
const PISTON_LANG: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  cpp: "c++",
  c: "c",
  java: "java",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  php: "php",
  scala: "scala",
  bash: "bash",
  sql: "sqlite3",
  r: "rscript",
  lua: "lua",
  perl: "perl",
  haskell: "haskell",
  dart: "dart",
  fsharp: "fsi",
  elixir: "elixir",
  fortran: "fortran",
  asm: "nasm",
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

async function runOnPiston(code: string, stdin: string, pistonLang: string): Promise<RunResult> {
  const res = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      language: pistonLang,
      version: "*",
      files: [{ content: code }],
      stdin,
      compile_timeout: 10000,
      run_timeout: 10000,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (res.status === 429) throw new Error("Free runner is busy — try again in a moment.");
  if (!res.ok) throw new Error(j.message || `Runner error (${res.status})`);
  const run = j.run ?? {};
  const compile = j.compile;
  const compileFailed = compile && compile.code !== 0;
  const status = compileFailed
    ? "Compilation Error"
    : run.code === 0
      ? "Accepted"
      : run.signal
        ? `Killed (signal ${run.signal})`
        : `Exit code ${run.code}`;
  return {
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
    compileOutput: compile ? (compile.stderr || compile.output || "") : "",
    message: j.message ?? "",
    status,
    provider: "piston",
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
        if (lang && PISTON_LANG[lang.key]) providers.push(() => runOnPiston(code, stdin, PISTON_LANG[lang.key]));
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
