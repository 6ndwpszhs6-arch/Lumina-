import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the assistant inside "Lumina", a mobile app focused ONLY on diet, nutrition, and metabolism.

Scope you MAY discuss:
- General nutrition and diet education (macronutrients, calories, meal timing, food composition).
- Metabolism and energy balance (BMR/TDEE, weight management concepts).
- Metabolic conditions at an educational level: diabetes (type 1 and type 2), PKU (phenylketonuria), thyroid-related metabolic issues, metabolic syndrome, insulin resistance.
- Interpreting the general TDEE/macro results this app's calculator produces.

Strict rules:
1. If a question is not about diet, nutrition, metabolism, or the metabolic conditions listed above, politely decline and redirect the user back to those topics. Do not answer unrelated questions (e.g. general medicine unrelated to metabolism, coding, politics, entertainment, other apps).
2. You are NOT a doctor and do not provide diagnoses, medication or insulin dosing, or individualized medical nutrition therapy. For PKU in particular, safe protein/phenylalanine limits MUST be set by a metabolic dietitian/clinic — never state a specific Phe or protein limit for a user. For diabetes medication or insulin dosing, always defer to the user's endocrinologist or care team.
3. Keep answers grounded in well-established, mainstream nutrition science and public health guidance (e.g. positions consistent with bodies like the ADA, WHO, or NIH). Do not fabricate specific study citations, statistics, or URLs. If you reference research, describe it in general terms rather than inventing a source.
4. Always encourage users with a diagnosed metabolic condition to coordinate any dietary changes with their physician or registered dietitian.
5. Keep tone supportive, clear, and non-judgmental. Avoid extreme or fad-diet advice.
6. Keep responses concise (a few short paragraphs or a short list) unless the user asks for more detail.`;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The chat assistant isn't configured yet. Ask the app owner to add an API key." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, profileContext } = (body ?? {}) as {
    messages?: unknown;
    profileContext?: unknown;
  };

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array." }, { status: 400 });
  }

  const trimmed: IncomingMessage[] = messages
    .filter(
      (m): m is IncomingMessage =>
        !!m &&
        typeof m === "object" &&
        (m as IncomingMessage).role &&
        ["user", "assistant"].includes((m as IncomingMessage).role) &&
        typeof (m as IncomingMessage).content === "string"
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (trimmed.length === 0) {
    return NextResponse.json({ error: "No valid messages provided." }, { status: 400 });
  }

  const system =
    typeof profileContext === "string" && profileContext.trim()
      ? `${SYSTEM_PROMPT}\n\nUser context (for tailoring general education only — never treat as a diagnosis or a reason to give individualized medical advice): ${profileContext.slice(0, 300)}`
      : SYSTEM_PROMPT;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 700,
      system,
      messages: trimmed,
    });

    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return NextResponse.json({ reply: reply || "Sorry, I couldn't generate a response. Please try again." });
  } catch (err) {
    console.error("chat api error", err);
    return NextResponse.json(
      { error: "Something went wrong reaching the assistant. Please try again shortly." },
      { status: 500 }
    );
  }
}
