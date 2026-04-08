import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

const requestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Shkruani nje pyetje para se te dergoni mesazhin.")
    .max(500, "Pyetja eshte shume e gjate. Ju lutem shkurtojeni."),
});

const SCHEMA_CONTEXT = `
### STRICT LANGUAGE RULE:
1. Detect user's language: If English -> Respond ONLY in English. If Albanian -> Respond ONLY in Albanian.
2. NEVER mix languages. If the user says "thanks", reply "You're welcome!". If they say "faleminderit", reply "S'ka gje!".

Baza e te dhenave dhe Sistemit (Bilingual Context):
1. sales (Shitjet): Revenue / Te hyrat. 'Add Sale' to record income.
2. purchases (Blerjet): Expenses / Shpenzimet. 'Register Purchase' to upload invoice photos; AI extracts data.
3. stock (Magazina): Inventory / Stoku. Quantity increases on purchase, decreases on sale.
4. profiles: User roles (admin/user) and info.

USAGE / PERDORIMI:
- Purchases: Dashboard -> Purchases -> Register Purchase.
- Sales: Dashboard -> Sales -> Add Sale.
- Stock: Dashboard -> Stock.

RESPONSE FORMAT:
You must return ONLY a JSON object with this structure:
{
  "type": "sql" | "explanation",
  "sql": "A valid PostgreSQL query if the user asks for data, otherwise null",
  "content": "A friendly explanation in Albanian if the user asks 'how' or 'what is this', or a summary of results."
}

Guidelines:
- CRITICAL: Detect the user's language. If they write in English (e.g. "hello", "how are you"), you MUST respond in English. If they write in Albanian (e.g. "si jeni", "pershendetje"), you MUST respond in Albanian.
- If the user says hello, thank you, or other social messages, respond politely in THEIR EXACT language in 'content' and set type="explanation".
- If the user asks for specific data (e.g. "sa kam blere"), set type="sql" and write the SQL. Use COALESCE(sum(...), 0) for totals.
- If the user asks how to use something or what a feature does, set type="explanation" and explain it.
- NEVER include a semicolon (;) at the end of the SQL query.
- Use date::date = CURRENT_DATE for 'today'.
- Be helpful and professional.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Input i pavlefshem" }, { status: 400 });
    }

    const { message } = parsed.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Sesioni ka skaduar. Ju lutem hyni perseri." }, { status: 401 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Mungon OPENROUTER_API_KEY ne .env.local" }, { status: 500 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: SCHEMA_CONTEXT,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorPayload?.error?.message || "Sherbimi AI nuk po pergjigjet per momentin." },
        { status: response.status }
      );
    }

    const aiData = await response.json();

    if (aiData.error) {
      throw new Error(aiData.error.message || "Gabim nga OpenRouter");
    }

    const rawContent = aiData.choices?.[0]?.message?.content?.trim()?.replace(/```json|```/g, "");
    if (!rawContent) {
      throw new Error("AI nuk ktheu pergjigje te lexueshme.");
    }

    let aiResponse: { type?: string; sql?: string | null; content?: string | null };
    try {
      aiResponse = JSON.parse(rawContent);
    } catch {
      aiResponse = { type: "explanation", sql: null, content: rawContent };
    }

    if (aiResponse.type === "sql" && aiResponse.sql) {
      const sql = aiResponse.sql.replace(/;$/, "");
      const { data, error } = await supabase.rpc("execute_sql", { query: sql });

      if (error) {
        return NextResponse.json({ error: error.message, sql }, { status: 400 });
      }

      return NextResponse.json({ data, sql, content: aiResponse.content });
    }

    return NextResponse.json({ content: aiResponse.content || "Nuk kam nje pergjigje per kete." });
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Kerkesa ndaj AI po zgjat shume. Provoni perseri pas pak."
        : error instanceof Error
          ? error.message
          : "Ndodhi nje gabim i papritur.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
