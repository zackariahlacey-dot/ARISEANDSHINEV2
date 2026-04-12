import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  let body: { imageBase64: string; mimeType: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Missing imageBase64 or mimeType" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `You are analyzing a business expense receipt for a mobile auto detailing company. Extract information and return ONLY valid JSON with these exact keys:
{
  "amount": (number — total amount paid, required),
  "date": (string — ISO date YYYY-MM-DD, or null if not visible),
  "vendor": (string — store or business name, or null),
  "category": (string — one of exactly: "fuel", "chemicals", "equipment", "vehicle", "insurance", "other"),
  "description": (string — brief description of what was purchased, max 80 characters)
}

Category guide:
- fuel: gas station, fuel purchases
- chemicals: cleaning products, detailing supplies, wax, polish, shampoo, microfiber cloths
- equipment: polishers, vacuums, pressure washers, tools, machines
- vehicle: car repairs, oil changes, tires, registration, maintenance
- insurance: insurance premiums of any kind
- other: anything else (food, office supplies, etc.)

Return ONLY the JSON object with no markdown, no explanation, no extra text.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse receipt" }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, ...parsed });
  } catch (err) {
    console.error("[receipt-parse]", err);
    return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
  }
}
