import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Mungon OpenRouter API Key në .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Asnjë skedar nuk u ngarkua" }, { status: 400 });
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
      For items, if the unit is not clear, use 'copë'.
      The language of the invoice might be Albanian or English.
      Return ONLY the JSON object, no other text.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://antigravity-erp.com", // Optional
        "X-Title": "Anti-Gravity ERP", // Optional
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": prompt
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:${file.type};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || "Gabim nga OpenRouter");
    }

    const responseText = data.choices[0].message.content || "{}";
    const extractedData = JSON.parse(responseText);

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: error.message || "Gabim gjatë procesimit me AI" }, { status: 500 });
  }
}
