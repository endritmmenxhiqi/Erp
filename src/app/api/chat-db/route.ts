import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SCHEMA_CONTEXT = `
### STRICT LANGUAGE RULE:
1. Detect user's language: If English -> Respond ONLY in English. If Albanian -> Respond ONLY in Albanian.
2. NEVER mix languages. If the user says "thanks", reply "You're welcome!". If they say "faleminderit", reply "S'ka gjë!".

Baza e të dhënave dhe Sistemit (Bilingual Context):
1. sales (Shitjet): Revenue / Të hyrat. 'Add Sale' to record income.
2. purchases (Blerjet): Expenses / Shpenzimet. 'Register Purchase' to upload invoice photos; AI extracts data.
3. stock (Magazina): Inventory / Stoku. Quantity increases on purchase, decreases on sale.
4. profiles: User roles (admin/user) and info.

USAGE / PËRDORIMI:
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
- CRITICAL: Detect the user's language. If they write in English (e.g. "hello", "how are you"), you MUST respond in English. If they write in Albanian (e.g. "si jeni", "përshëndetje"), you MUST respond in Albanian.
- If the user says hello, thank you, or other social messages, respond politely in THEIR EXACT language in 'content' and set type="explanation".
- If the user asks for specific data (e.g. "sa kam blerë"), set type="sql" and write the SQL. Use COALESCE(sum(...), 0) for totals.
- If the user asks how to use something or what a feature does, set type="explanation" and explain it.
- NEVER include a semicolon (;) at the end of the SQL query.
- Use date::date = CURRENT_DATE for 'today'.
- Be helpful and professional.
`;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "Mungon OPENROUTER_API_KEY në .env.local" }, { status: 500 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
          {
            "role": "system",
            "content": SCHEMA_CONTEXT
          },
          {
            "role": "user",
            "content": message
          }
        ]
      })
    });

    const aiData = await response.json();
    
    if (aiData.error) {
      throw new Error(aiData.error.message || "Gabim nga OpenRouter");
    }

    const rawContent = aiData.choices[0].message.content.trim().replace(/```json|```/g, '');
    let aiResponse;
    try {
      aiResponse = JSON.parse(rawContent);
    } catch (e) {
      // Fallback if AI didn't return valid JSON
      aiResponse = { type: 'explanation', sql: null, content: rawContent };
    }

    if (aiResponse.type === 'sql' && aiResponse.sql) {
      const sql = aiResponse.sql.replace(/;$/, '');
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('execute_sql', { query: sql });

      if (error) {
        return NextResponse.json({ error: error.message, sql }, { status: 400 });
      }

      return NextResponse.json({ data, sql, content: aiResponse.content });
    }

    return NextResponse.json({ content: aiResponse.content });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
