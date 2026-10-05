import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const Body = z.object({
  mode: z.enum(["fix", "optimize", "explain", "write"]),
  language: z.string().max(50),
  code: z.string().max(100_000),
  output: z.string().max(20_000).default(""),
  prompt: z.string().max(4_000).default(""),
});

const INSTRUCTIONS: Record<string, string> = {
  fix: "Find the bugs or errors in this program (use the run output if given). Briefly explain the cause, then give the full corrected program in one fenced code block.",
  optimize: "Optimize this program for speed, memory and readability. List the key improvements briefly (with complexity notes), then give the full optimized program in one fenced code block.",
  explain: "Explain this program clearly and concisely for a learner: what it does, how it works step by step, and its time/space complexity. Do not rewrite it.",
  write: "Write a complete, efficient, runnable program for the user's request. Read input from stdin if needed. Give a one-line summary, then the full program in one fenced code block.",
};

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const { mode, language, code, output, prompt } = parsed.data;
        const apiKey = process.env["LOVABLE_API_KEY"]!;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });
        const user = [
          `Language: ${language}`,
          prompt && `Request: ${prompt}`,
          code && `Code:\n\`\`\`\n${code}\n\`\`\``,
          output && `Last run output:\n${output}`,
        ]
          .filter(Boolean)
          .join("\n\n");
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: `You are an expert ${language} engineer inside an online compiler. ${INSTRUCTIONS[mode]} Use Markdown. Be concise.`,
          prompt: user,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          onError: ({ error }) => console.error("AI error", error),
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
