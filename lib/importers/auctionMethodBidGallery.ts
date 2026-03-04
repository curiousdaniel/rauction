import type { ImportResult, Importer } from "@/lib/importers/types";

type LooseRecord = Record<string, unknown>;

function firstMatch(input: string, regex: RegExp) {
  return input.match(regex)?.[1]?.trim();
}

function parseJsonScripts(html: string) {
  const blocks: unknown[] = [];
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(regex)) {
    const body = match[1]?.trim();
    if (!body) continue;
    if (!body.startsWith("{") && !body.startsWith("[")) continue;
    try {
      blocks.push(JSON.parse(body));
    } catch {
      continue;
    }
  }
  return blocks;
}

function collectStringValues(value: unknown, output: string[]) {
  if (typeof value === "string") {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as LooseRecord)) {
      collectStringValues(item, output);
    }
  }
}

function extractLikelyImages(html: string) {
  const images = new Set<string>();
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(ogRegex)) {
    if (match[1]) images.add(match[1]);
  }

  const srcRegex = /https?:\/\/[^"'\s)]+?\.(?:jpg|jpeg|png|webp)/gi;
  for (const match of html.matchAll(srcRegex)) {
    if (match[0]) images.add(match[0]);
    if (images.size >= 6) break;
  }

  return Array.from(images).slice(0, 6);
}

function inferLocationFromText(titleText: string, bodyText: string) {
  const combined = `${titleText} ${bodyText}`.replace(/\s+/g, " ");
  const locatedIn = combined.match(/located in\s+([A-Za-z .'-]+),\s*([A-Z]{2})/i);
  if (locatedIn) {
    return {
      city: locatedIn[1].trim(),
      region: locatedIn[2].trim().toUpperCase(),
    };
  }

  const inCityState = combined.match(/\bin\s+([A-Za-z .'-]+),\s*([A-Z]{2})\b/);
  if (inCityState) {
    return {
      city: inCityState[1].trim(),
      region: inCityState[2].trim().toUpperCase(),
    };
  }

  return { city: "", region: "" };
}

function inferEndDateFromText(bodyText: string) {
  const pattern = /(?:ends|ending|end on)\s+(?:on\s+)?([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,)?(?: \d{4})?(?: at \d{1,2}:\d{2}\s*(?:am|pm))?)/i;
  const match = bodyText.match(pattern)?.[1];
  if (!match) return "";
  const cleaned = match.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

export const auctionMethodBidGalleryImporter: Importer = {
  id: "auctionmethod-bidgallery",
  canHandle(url, html) {
    const path = url.pathname.toLowerCase();
    return (
      (path.includes("/auction/") && path.includes("/bidgallery/")) ||
      html.toLowerCase().includes("auctionmethod.com")
    );
  },
  async parse(url, html): Promise<ImportResult> {
    const warnings: string[] = [];
    const title =
      firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
      "";
    const description =
      firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      "";

    const scriptValues: string[] = [];
    for (const block of parseJsonScripts(html)) {
      collectStringValues(block, scriptValues);
    }

    const longText = `${description} ${scriptValues.join(" ")}`.replace(/\s+/g, " ");
    const images = extractLikelyImages(html);
    const location = inferLocationFromText(title, longText);
    const inferredEnd = inferEndDateFromText(longText || title);

    let confidence = 68;
    if (!location.city || !location.region) {
      confidence -= 15;
      warnings.push("Location could not be confidently extracted. Please verify city/state.");
    }
    if (!inferredEnd) {
      confidence -= 10;
      warnings.push("End date was not confidently extracted. Please set start/end times manually.");
    }
    if (images.length < 3) {
      confidence -= 10;
      warnings.push("Fewer than 3 images found; add more image URLs before scheduling.");
    }

    return {
      provider: "auctionMethodBidGallery",
      confidence: Math.max(20, confidence),
      warnings,
      data: {
        title,
        description,
        auctionUrl: url.toString(),
        moreInfoUrl: url.toString(),
        auctionType: "ONLINE",
        locationCity: location.city,
        locationRegion: location.region,
        startAt: "",
        endAt: inferredEnd || "",
        imageUrls: images,
      },
      debug: {
        scriptsScanned: scriptValues.length,
        imageCount: images.length,
      },
    };
  },
};
