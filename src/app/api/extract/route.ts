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

type ExtractedPageResult = {
  invoice_num?: string | null;
  date?: string | null;
  total_cost?: number | null;
  seller_fiscal_num?: string | null;
  items?: Array<{
    item_name?: string;
    quantity?: number;
    unit?: string;
    cost_price?: number;
  }>;
};

async function extractSinglePage(
  file: UploadedFile,
  pageIndex: number,
  totalPages: number,
  apiKey: string
): Promise<ExtractedPageResult> {
  const isMulti = totalPages > 1;
  const prompt = `You are an expert invoice OCR and data extraction system.
${
  isMulti
    ? `This is PAGE ${pageIndex} OF ${totalPages} of a multi-page invoice in Albanian or English.`
    : `This is an invoice in Albanian or English.`
}

Extract ALL table item rows visible on this specific page image.

Return ONLY a JSON object with this exact structure:
{
  "invoice_num": "string or null",
  "date": "YYYY-MM-DD or null",
  "total_cost": number or null,
  "seller_fiscal_num": "string or null",
  "items": [
    {
      "item_name": "string",
      "quantity": number,
      "unit": "string",
      "cost_price": number
    }
  ]
}

CRITICAL RULES:
1. ITEMS: Extract EVERY single item row visible in the table on this page image. Do NOT skip any rows.
2. For each item's "cost_price": PREFERRED method is to use the per-item line total INCLUDING VAT (often labeled "SHUMA", "Total", "Amount") DIVIDED by the quantity.
   Example: if SHUMA=778.80 and quantity=2, then cost_price=389.40.
   FALLBACK: calculate cost_price = unit_price * (1 + TVSH_rate/100).
   cost_price MUST ALWAYS include VAT/TVSH.
3. If unit is not specified, use 'cope'.
4. "total_cost": If this page displays the FINAL grand total to pay ("PËR T'U PAGUAR", "TOTALI", "Gjithsej me TVSH", "Grand Total"), extract that number. If this page only has a subtotal or no final total, set total_cost to null.
5. "invoice_num", "date", "seller_fiscal_num": If visible on this page (usually in the header), extract them; otherwise set them to null.
6. Return ONLY the raw JSON object, no explanation.`;

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
                url: `data:${file.mimeType};base64,${file.buffer.toString("base64")}`,
                detail: "high",
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
    const msg = errorPayload?.error?.message || `Procesimi i faqes ${pageIndex} deshtoi.`;
    throw new Error(msg);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content;
  if (!responseText) {
    throw new Error(`AI nuk ktheu te dhena per faqen ${pageIndex}.`);
  }

  return parseJsonResponse(responseText);
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

    // Process all pages in parallel
    const pageResults = await Promise.all(
      files.map((file, index) => extractSinglePage(file, index + 1, files.length, apiKey))
    );

    // Merge page results deterministically
    let invoice_num = "";
    let date = "";
    let seller_fiscal_num = "";
    let total_cost = 0;
    const allItems: Array<{
      item_name: string;
      quantity: number;
      unit: string;
      cost_price: number;
    }> = [];

    for (let i = 0; i < pageResults.length; i++) {
      const p = pageResults[i];

      if (!invoice_num && p.invoice_num) invoice_num = p.invoice_num;
      if (!date && p.date) date = p.date;
      if (!seller_fiscal_num && p.seller_fiscal_num) seller_fiscal_num = p.seller_fiscal_num;

      const pageTotal = Number(p.total_cost);
      if (!Number.isNaN(pageTotal) && pageTotal > 0) {
        total_cost = pageTotal;
      }

      if (Array.isArray(p.items)) {
        for (const item of p.items) {
          if (item && typeof item === "object") {
            allItems.push({
              item_name: item.item_name || "",
              quantity: Number(item.quantity) || 1,
              unit: item.unit || "cope",
              cost_price: Number(item.cost_price) || 0,
            });
          }
        }
      }
    }

    // Fallbacks if header info was on another page
    if (!invoice_num) {
      invoice_num = pageResults.find((p) => Boolean(p.invoice_num))?.invoice_num || "";
    }
    if (!date) {
      date = pageResults.find((p) => Boolean(p.date))?.date || "";
    }
    if (!seller_fiscal_num) {
      seller_fiscal_num = pageResults.find((p) => Boolean(p.seller_fiscal_num))?.seller_fiscal_num || "";
    }

    // If total_cost is still 0, calculate sum of (qty * cost_price)
    if (total_cost <= 0 && allItems.length > 0) {
      total_cost = parseFloat(
        allItems.reduce((acc, it) => acc + it.quantity * it.cost_price, 0).toFixed(2)
      );
    }

    const mergedData = {
      invoice_num,
      date,
      seller_fiscal_num,
      total_cost,
      items: allItems,
    };

    return NextResponse.json(mergedData);
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
