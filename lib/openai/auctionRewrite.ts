import OpenAI from "openai";

type RewriteInput = {
  auctionType: "ONLINE" | "LIVE";
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  auctionUrl: string;
  moreInfoUrl: string | null;
  imageUrls: string[];
  featuredItems: string[];
  rawTitle: string | null;
  rawDescription: string | null;
  sourceUrl: string | null;
};

type RewriteOutput = {
  title: string;
  description: string;
  notes: string[];
};

const rewriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "notes"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    notes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function formatMonthDay(input: string | null, timezone: string | null) {
  if (!input) return "";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone || "UTC",
  }).format(parsed);
}

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while (true) {
    const index = haystack.indexOf(needle, cursor);
    if (index === -1) return count;
    count += 1;
    cursor = index + needle.length;
  }
}

function validateRewrite(input: RewriteInput, output: RewriteOutput) {
  const errors: string[] = [];
  const title = output.title.trim();
  const description = output.description;

  if (!title.startsWith("[AUCTION]")) {
    errors.push('Title must start with "[AUCTION]".');
  }

  const city = (input.locationCity || "").trim();
  const region = (input.locationRegion || "").trim();
  const titleLower = title.toLowerCase();
  if (city && !titleLower.includes(city.toLowerCase())) {
    errors.push("Title must include location city.");
  }
  if (region && !titleLower.includes(region.toLowerCase())) {
    errors.push("Title must include location region/state.");
  }

  const relevantDate =
    input.auctionType === "ONLINE"
      ? formatMonthDay(input.endAt || input.startAt, input.timezone)
      : formatMonthDay(input.startAt || input.endAt, input.timezone);
  if (relevantDate && !title.includes(relevantDate)) {
    errors.push(`Title must include correct date (${relevantDate}).`);
  }
  if (input.auctionType === "ONLINE" && !titleLower.includes("ends ")) {
    errors.push('ONLINE title must include "ends {MMM D}".');
  }

  const urlCount = countOccurrences(description, input.auctionUrl);
  if (urlCount !== 1) {
    errors.push("Description must include auctionUrl exactly once.");
  }

  return errors;
}

async function callRewriteModel(client: OpenAI, input: RewriteInput, repairContext?: string) {
  const systemPrompt = `You are implementing an OpenAI (ChatGPT) rewrite step for auction posts in our Next.js app.

Goal:
Given structured auction data (and optionally the raw imported title/description), generate:
1) A Reddit-ready post title that matches our r/auction format guidelines.
2) A clean, simple, marketable description (2 to 5 sentences) that is accurate and does not add facts.

Hard rules:
- Do NOT invent, guess, or hallucinate any details (dates, location, asset types, inspection times, lot counts, pickup dates, terms, etc.).
- Use ONLY the provided fields. If something is missing, omit it or use neutral language that does not imply specifics.
- Keep language clean and professional, no hype, no clickbait, no ALL CAPS, no emojis.
- Avoid em dashes (—). Use commas or periods instead.
- If the user provided text contains suspect claims, do not repeat them unless supported by structured fields.

Title guidelines:
- Must begin with "[AUCTION]"
- Must include an asset category/short type, city, state/province, and the relevant date.
- ONLINE auctions: include end date (preferred), LIVE auctions: include start date.
- Title format:
  ONLINE: "[AUCTION] {Asset Category}, {City}, {Region}, ends {MMM D}"
  LIVE:   "[AUCTION] {Asset Category}, {City}, {Region}, {MMM D}"
- If asset category is unknown, infer a conservative category from provided keywords (e.g., "Estate", "Heavy Equipment", "Restaurant Equipment", "Vehicles", "Coins", "Jewelry", "General Merchandise"). Only infer if there is clear evidence in the provided data (like featuredItems or raw title). Otherwise use "Auction".

Description guidelines:
- 2 to 5 sentences.
- First sentence: what it is and where.
- Second sentence: what kinds of items are included (broad categories), avoid too many specifics.
- Third sentence (optional): mention start/end info if helpful.
- Mention the auction link once, at the end as plain text (no markdown link formatting).
- Do not mention r/auction rules, do not mention “guidelines”.

Output format:
Return ONLY valid JSON with these keys:
{
  "title": string,
  "description": string,
  "notes": string[]   // short notes about omissions or uncertainties
}`;

  const repairPrompt = repairContext
    ? `Fix only the failing parts while preserving all correct parts.\n${repairContext}`
    : "";

  const response = await client.responses.create({
    model: process.env.OPENAI_REWRITE_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    text: {
      format: {
        type: "json_schema",
        name: "auction_rewrite",
        strict: true,
        schema: rewriteSchema,
      },
    },
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: repairPrompt
          ? `Input auction data:\n${JSON.stringify(input, null, 2)}\n\n${repairPrompt}`
          : `Input auction data:\n${JSON.stringify(input, null, 2)}\n\nNow generate the JSON response.`,
      },
    ],
  });

  return JSON.parse(response.output_text) as RewriteOutput;
}

export async function rewriteAuctionCopy(input: RewriteInput): Promise<RewriteOutput> {
  const client = new OpenAI({
    apiKey: requiredEnv("OPENAI_API_KEY"),
  });

  const first = await callRewriteModel(client, input);
  const firstErrors = validateRewrite(input, first);
  if (firstErrors.length === 0) {
    return first;
  }

  const repaired = await callRewriteModel(
    client,
    input,
    `Validation errors:\n- ${firstErrors.join("\n- ")}\n\nPrevious output:\n${JSON.stringify(first, null, 2)}`,
  );

  const secondErrors = validateRewrite(input, repaired);
  if (secondErrors.length === 0) {
    return repaired;
  }

  throw new Error(`Rewrite validation failed after retry: ${secondErrors.join("; ")}`);
}
