import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Mungon OpenRouter API Key ne .env.local" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Asnje skedar nuk u ngarkua" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Ngarkoni vetem imazh ose PDF." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Skedari eshte shume i madh. Kufiri eshte 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const prompt = `
      Extract information from this invoice image.
      Return ONLY a JSON object with this structure:
      {
        "invoice_num": "string",
        "date": "YYYY-MM-DD",
        "total_cost": number,
        "seller_fiscal_num": "string",
        "items": [
          {
            "item_name": "string",
            "quantity": number,
            "unit": "string"
          }
        ]
      }
      If a value is not found, use null or empty string.
      For items, if the unit is not clear, use 'cope'.
      The language of the invoice might be Albanian or English.
      Return ONLY the JSON object, no other text.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://antigravity-erp.com",
        "X-Title": "ERP System",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorPayload?.error?.message || "Procesimi me AI deshtoi." },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Gabim nga OpenRouter");
    }

    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("AI nuk ktheu te dhena te lexueshme.");
    }

    const extractedData = JSON.parse(responseText);

    return NextResponse.json(extractedData);
  } catch (error: unknown) {
    console.error("Extraction error:", error);
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Procesimi me AI po zgjat shume. Provoni perseri pas pak."
        : error instanceof Error
          ? error.message
          : "Gabim gjate procesimit me AI";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
