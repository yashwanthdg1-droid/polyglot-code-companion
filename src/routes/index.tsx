import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Play, Wand2, Gauge, BookOpen, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PolyRun — Run code in 25+ languages with AI help" },
      { name: "description", content: "Online compiler for Python, C++, Java, Go, Rust and more, with AI that fixes, optimizes, explains and writes code." },
      { property: "og:title", content: "PolyRun — Online multi-language compiler" },
      { property: "og:description", content: "Run programs in 25+ languages and let AI fix, optimize and explain them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type RunResult = { stdout?: string; stderr?: string; compileOutput?: string; message?: string; status?: string; time?: string; memory?: number; error?: string };
type Mode = "fix" | "optimize" | "explain" | "write";

function makeWebPreview(language: string, code: string) {
  if (language === "html") return code;
  const safeCss = code.replace(/<\/style/gi, "<\\/style");
  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${safeCss}</style></head>
<body><main class="preview"><p class="eyebrow">CSS PREVIEW</p><h1>Style this page</h1><p>Edit the CSS to change colors, spacing, and typography.</p><button>Example button</button></main></body>
</html>`;
}

function Index() {
  const [langKey, setLangKey] = useState("python");
  const lang = LANGUAGES.find((l) => l.key === langKey)!;
  const [codes, setCodes] = useState<Record<string, string>>({});
  const code = codes[langKey] ?? lang.template;
  const setCode = (c: string) => setCodes((p) => ({ ...p, [langKey]: c }));
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [webPreview, setWebPreview] = useState<string | null>(null);
  const [ai, setAi] = useState("");
  const [aiBusy, setAiBusy] = useState<Mode | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tab, setTab] = useState<"output" | "ai">("output");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("polyrun-codes");
      if (saved) setCodes(JSON.parse(saved));
      const l = localStorage.getItem("polyrun-lang");
      if (l && LANGUAGES.some((x) => x.key === l)) setLangKey(l);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("polyrun-codes", JSON.stringify(codes));
    localStorage.setItem("polyrun-lang", langKey);
  }, [codes, langKey]);

  const outputText = result
    ? [result.compileOutput, result.stdout, result.stderr, result.message, result.error].filter(Boolean).join("\n")
    : "";

  async function run() {
    setRunning(true);
    setTab("output");
    setResult(null);
    if (langKey === "html" || langKey === "css") {
      setWebPreview(makeWebPreview(langKey, code));
      setResult({ status: "Preview ready" });
      setRunning(false);
      return;
    }
    setWebPreview(null);
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ languageId: lang.id, code, stdin }),
      });
      setResult(await r.json());
    } catch {
      setResult({ error: "Could not reach the code runner." });
    } finally {
      setRunning(false);
    }
  }

  async function askAi(mode: Mode) {
    if (mode === "write" && !prompt.trim()) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setAiBusy(mode);
    setTab("ai");
    setAi("");
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({ mode, language: lang.name, code: mode === "write" ? "" : code, output: outputText.slice(0, 20000), prompt }),
      });
      if (!r.ok || !r.body) {
        setAi(`**Error:** ${await r.text()}`);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setAi(acc);
      }
      if (!acc) setAi("_No response — please try again in a moment._");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setAi("**Error:** AI request failed.");
    } finally {
      setAiBusy(null);
    }
  }

  const aiCode = (() => {
    const m = ai.match(/```[\w+#-]*\n([\s\S]*?)```/);
    return m?.[1];
  })();

  const ok = result?.status === "Accepted";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">{"</>"}</div>
          <div>
            <h1 className="text-lg font-semibold leading-none">PolyRun</h1>
            <p className="text-xs text-muted-foreground">{LANGUAGES.length} languages · AI-assisted</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={langKey}
            onChange={(e) => setLangKey(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
            aria-label="Language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.key} value={l.key}>{l.name}</option>
            ))}
          </select>
          <Button onClick={run} disabled={running} className="glow-primary">
            {running ? <Loader2 className="animate-spin" /> : <Play />} Run
          </Button>
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-editor">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
              <span className="font-mono">main.{lang.key}</span>
              <button className="hover:text-foreground" onClick={() => setCode(lang.template)}>Reset</button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const t = e.currentTarget, s = t.selectionStart, en = t.selectionEnd;
                  const v = code.slice(0, s) + "  " + code.slice(en);
                  setCode(v);
                  requestAnimationFrame(() => (t.selectionStart = t.selectionEnd = s + 2));
                }
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run();
              }}
              spellCheck={false}
              className="code block h-[45vh] w-full resize-y bg-transparent p-3 text-sm leading-relaxed outline-none lg:h-[60vh]"
            />
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Program input (stdin)…"
            className="code h-20 rounded-lg border border-border bg-editor p-3 text-sm outline-none"
          />
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI assistant</div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => askAi("fix")} disabled={!!aiBusy}><Wand2 /> Fix</Button>
              <Button variant="secondary" onClick={() => askAi("optimize")} disabled={!!aiBusy}><Gauge /> Optimize</Button>
              <Button variant="secondary" onClick={() => askAi("explain")} disabled={!!aiBusy}><BookOpen /> Explain</Button>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAi("write")}
                placeholder="Describe a program to write…"
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              />
              <Button onClick={() => askAi("write")} disabled={!!aiBusy || !prompt.trim()}>Write</Button>
            </div>
          </div>
        </section>

        <section className="flex min-h-[40vh] flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex border-b border-border text-sm">
            {(["output", "ai"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
              >
                {t === "output" ? "Output" : "AI"}
              </button>
            ))}
            {tab === "output" && result?.status && (
              <span className={`ml-auto self-center px-3 text-xs ${ok ? "text-success" : "text-destructive"}`}>
                {result.status}{result.time ? ` · ${result.time}s` : ""}{result.memory ? ` · ${result.memory} KB` : ""}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {tab === "output" ? (
              running ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Running…</p>
              ) : (langKey === "html" || langKey === "css") && webPreview ? (
                <iframe
                  title={`${lang.name} preview`}
                  srcDoc={webPreview}
                  sandbox="allow-scripts"
                  className="h-[55vh] min-h-[320px] w-full border-0 bg-background"
                />
              ) : result ? (
                <pre className={`whitespace-pre-wrap text-sm ${ok ? "" : "text-destructive"}`}>{outputText || "(no output)"}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">Press Run (or Ctrl+Enter) to execute your program.</p>
              )
            ) : (
              <>
                {aiBusy && !ai && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</p>}
                {!aiBusy && !ai && <p className="text-sm text-muted-foreground">Ask the AI to fix, optimize, explain or write code.</p>}
                <div className="prose-ai text-sm leading-relaxed"><ReactMarkdown>{ai}</ReactMarkdown></div>
                {aiCode && !aiBusy && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => { setCode(aiCode); setTab("output"); }}>Apply to editor</Button>
                    <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(aiCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                      {copied ? <Check /> : <Copy />} Copy
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
