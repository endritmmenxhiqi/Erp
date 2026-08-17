import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const AI_TIMEOUT_MS = 35000;

export const runtime = "nodejs";
export const maxDuration = 45;

type UploadedFile = {
  buffer: Buffer;
  mimeType: string;
  size: number;
};

async function readUploadedFile(req: NextRequest): Promise<UploadedFile> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Asnje skedar nuk u ngarkua");
    }

    return {
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      size: file.size,
    };
  }

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const image = body?.image;

    if (typeof image !== "string") {
      throw new Error("Asnje skedar nuk u ngarkua");
    }

    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Formati i fotos nuk eshte valid");
    }

    const buffer = Buffer.from(match[2], "base64");

    return {
      buffer,
      mimeType: match[1],
      size: buffer.length,
    };
  }

  throw new Error("Formati i kerkeses nuk perkrahet");
}

function parseJsonResponse(responseText: string) {
  const cleaned = responseText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Mungon OpenAI API Key ne .env.local" }, { status: 500 });
    }

    const file = await readUploadedFile(req);

    if (!file.mimeType.startsWith("image/") && file.mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Ngarkoni vetem imazh ose PDF." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Skedari eshte shume i madh. Kufiri eshte 5MB." }, { status: 400 });
    }

    const base64Data = file.buffer.toString("base64");

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
            "unit": "string",
            "cost_price": number
          }
        ]
      }

      CRITICAL RULES FOR PRICES AND VAT/TVSH:
      - "total_cost" MUST be the FINAL total amount to pay INCLUDING VAT/TVSH (look for "PËR T'U PAGUAR", "Total", "Totali", "Gjithsej" etc.).
      - Each item on the invoice may have a DIFFERENT VAT/TVSH rate (e.g. 18%, 8%, 0%). You MUST read the actual TVSH rate for EACH item from the invoice. Do NOT assume all items have the same VAT rate.
      - For each item's "cost_price": PREFERRED method is to use the per-item line total INCLUDING VAT (often labeled "SHUMA", "Total", "Amount") DIVIDED by the quantity.
        Example: if SHUMA=778.80 and quantity=2, then cost_price=389.40
      - FALLBACK: if no line total column exists, read the unit price AND the actual TVSH rate for that specific item, then calculate: cost_price = unit_price * (1 + TVSH_rate/100).
        Example: unit price=330, that item's TVSH=18%, then cost_price = 330 * 1.18 = 389.40
        Example: unit price=100, that item's TVSH=8%, then cost_price = 100 * 1.08 = 108.00
      - Do NOT use the base unit price without VAT. The cost_price must ALWAYS include the item's actual VAT/TVSH.
      - The sum of (quantity * cost_price) for all items should approximately equal the total_cost.

      OTHER RULES:
      - If a value is not found, use null or empty string.
      - For items, if the unit is not clear, use 'cope'.
      - The language of the invoice might be Albanian or English.
      - Albanian invoices often use: ÇMIMI UN. (unit price without VAT), TVSH (VAT rate per item), SHUMA (line total with VAT).
      - Return ONLY the JSON object, no other text.
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
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
                  url: `data:${file.mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const upstreamMessage = errorPayload?.error?.message || "Procesimi me AI deshtoi.";

      if (response.status === 401) {
        return NextResponse.json(
          {
            error:
              "OpenAI API key nuk eshte valid ose mungon ne Vercel. Kontrollo OPENAI_API_KEY te Environment Variables.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: upstreamMessage },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Gabim nga OpenAI");
    }

    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("AI nuk ktheu te dhena te lexueshme.");
    }

    const extractedData = parseJsonResponse(responseText);

    return NextResponse.json(extractedData);
  } catch (error: unknown) {
    console.error("Extraction error:", error);
    const message =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "Procesimi me AI po zgjat shume. Provoni perseri pas pak."
        : error instanceof Error
          ? error.message
          : "Gabim gjate procesimit me AI";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
