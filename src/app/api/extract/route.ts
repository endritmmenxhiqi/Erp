import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;
const AI_TIMEOUT_MS = 60000;

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadedFile = {
  buffer: Buffer;
  mimeType: string;
  size: number;
};

async function readUploadedFiles(req: NextRequest): Promise<UploadedFile[]> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const files: UploadedFile[] = [];

    // Support both "files" (multiple) and "file" (single) field names
    const allEntries = formData.getAll("files");
    if (allEntries.length === 0) {
      // Fallback: try "file" field (single file, backward compatible)
      const singleFile = formData.get("file");
      if (singleFile instanceof File) {
        allEntries.push(singleFile);
      }
    }

    for (const entry of allEntries) {
      if (entry instanceof File) {
        files.push({
          buffer: Buffer.from(await entry.arrayBuffer()),
          mimeType: entry.type,
          size: entry.size,
        });
      }
    }

    if (files.length === 0) {
      throw new Error("Asnje skedar nuk u ngarkua");
    }

    return files;
  }

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);

    // Support both "images" (array) and "image" (single string)
    const images: string[] = [];
    if (Array.isArray(body?.images)) {
      images.push(...body.images);
    } else if (typeof body?.image === "string") {
      images.push(body.image);
    }

    if (images.length === 0) {
      throw new Error("Asnje skedar nuk u ngarkua");
    }

    return images.map((image) => {
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
    });
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

    const files = await readUploadedFiles(req);

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maksimumi i fotove eshte ${MAX_FILES}.` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!file.mimeType.startsWith("image/") && file.mimeType !== "application/pdf") {
        return NextResponse.json({ error: "Ngarkoni vetem imazh ose PDF." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Nje skedar eshte shume i madh. Kufiri eshte 5MB per foto." }, { status: 400 });
      }
    }

    const imageContentBlocks = files.map((file) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${file.mimeType};base64,${file.buffer.toString("base64")}`,
      },
    }));

    const prompt = `
      Extract information from this invoice. ${files.length > 1 ? `This invoice has ${files.length} pages/images. Combine ALL items from ALL pages into a single result. Do NOT duplicate header info - use the first page for invoice number, date, etc.` : ""}
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
              ...imageContentBlocks,
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
