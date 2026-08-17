// Shared AI caller: OpenAI model ladder (primary) + free-tier Gemini (fallback).
// Uses chat/completions on both providers so request/response shape (incl. tool
// calls) is identical. LOVABLE gateway is intentionally NOT used.

const OPENAI_MODELS = ["gpt-5.6-luna", "gpt-5.4-mini", "gpt-4o-mini"];
// Ladder rationale: 5.6-luna = newest + cheapest; 5.4-mini = quality step-up if
// luna id unavailable on this account; gpt-4o-mini = last-resort (being sunset).
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export interface AIChatRequest {
  messages: any[];
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
}

export interface AIChatResult {
  data: any;
  provider: "openai" | "gemini";
  model: string;
  failures: string[];
}

function summarize(text: string) {
  return (text || "").slice(0, 500);
}

function isModelNotFound(status: number, body: string) {
  return status === 404 || /model_not_found|does not exist|unknown model/i.test(body);
}

async function post(url: string, key: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  return { res, text };
}

export async function callAIWithFallback(req: AIChatRequest): Promise<AIChatResult> {
  const { messages, tools, tool_choice, temperature } = req;
  const base: Record<string, unknown> = { messages };
  if (tools) base.tools = tools;
  if (tool_choice) base.tool_choice = tool_choice;
  if (typeof temperature === "number") base.temperature = temperature;

  const failures: string[] = [];
  const fail = (msg: string) => { console.warn(`AI attempt failed: ${msg}`); failures.push(msg); };
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    failures.push("openai: OPENAI_API_KEY missing");
  } else {
    for (const model of OPENAI_MODELS) {
      try {
        // GPT-5.6 models run with reasoning on by default and reject function
        // tools on /v1/chat/completions unless reasoning_effort is "none".
        const payload: Record<string, unknown> = { ...base, model };
        if (/^gpt-5\.6/.test(model)) payload.reasoning_effort = "none";
        const { res, text } = await post(OPENAI_URL, openaiKey, payload);
        if (res.ok) {
          console.log(`AI ok provider=openai model=${model}`);
          return { data: JSON.parse(text), provider: "openai", model, failures };
        }
        fail(`openai/${model}: ${res.status} ${summarize(text)}`);
        if (isModelNotFound(res.status, text)) continue; // try next ladder model
        break; // key/quota/other problem — go to fallback
      } catch (e) {
        fail(`openai/${model}: ${String(e)}`);
        break;
      }
    }
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    failures.push("gemini: GEMINI_API_KEY missing");
  } else {
    try {
      const { res, text } = await post(GEMINI_URL, geminiKey, { ...base, model: GEMINI_MODEL });
      if (res.ok) {
        console.log(`AI ok provider=gemini model=${GEMINI_MODEL}`);
        return { data: JSON.parse(text), provider: "gemini", model: GEMINI_MODEL, failures };
      }
      fail(`gemini/${GEMINI_MODEL}: ${res.status} ${summarize(text)}`);
    } catch (e) {
      fail(`gemini/${GEMINI_MODEL}: ${String(e)}`);
    }
  }

  throw new Error(`all_ai_providers_failed: ${failures.join(" | ")}`);
}

export { GEMINI_MODEL, OPENAI_MODELS };
