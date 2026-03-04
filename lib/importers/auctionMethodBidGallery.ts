import type { ImportResult, Importer } from "@/lib/importers/types";

type LooseRecord = Record<string, unknown>;

function firstMatch(input: string, regex: RegExp) {
  return input.match(regex)?.[1]?.trim();
}

function stripHtmlTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTermsText(html: string) {
  const termsBlock = html.match(/<!-- TERMS_HTML_BEGIN -->([\s\S]*?)<!-- TERMS_HTML_END -->/i)?.[1];
  return termsBlock ? stripHtmlTags(termsBlock) : "";
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

  // Highest-priority signal: AuctionMethod lot images often live in /i/... paths
  // and appear as ng-src/src values ending with _t.jpg or similar.
  const lotImageRegex =
    /(?:ng-src|src)=["'](https?:\/\/[^"']+\/i\/[^"']+\/i\d+-\d+_[a-z]\.(?:jpg|jpeg|png|webp))["']/gi;
  for (const match of html.matchAll(lotImageRegex)) {
    const url = match[1]?.trim();
    if (!url) continue;
    images.add(url);
    if (images.size >= 10) break;
  }

  if (images.size >= 3) {
    return Array.from(images).slice(0, 6);
  }

  // Secondary signal: explicit image URLs while filtering common non-lot assets.
  const strictImageRegex = /https?:\/\/[^"'\s)]+?\.(?:jpg|jpeg|png|webp)/gi;
  for (const match of html.matchAll(strictImageRegex)) {
    const candidate = match[0];
    if (!candidate) continue;
    const lowered = candidate.toLowerCase();
    if (lowered.includes("/auxiliary/")) continue;
    if (lowered.includes("logo")) continue;
    if (lowered.includes("icon")) continue;
    images.add(candidate);
    if (images.size >= 10) break;
  }

  if (images.size >= 3) {
    return Array.from(images).slice(0, 6);
  }

  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(ogRegex)) {
    if (match[1]) images.add(match[1]);
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

function inferLocationFromTerms(termsText: string) {
  const match =
    termsText.match(/Location:\s*[^,]+,\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*\d{5}/i) ??
    termsText.match(/Location:\s*([A-Za-z .'-]+),\s*([A-Z]{2})\b/i);

  if (!match) return { city: "", region: "" };
  return {
    city: match[1].trim(),
    region: match[2].trim().toUpperCase(),
  };
}

function parseUsDateTimeToIso(value: string) {
  const match = value.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:at|between)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)/i,
  );
  if (!match) return "";
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const meridiem = match[7].toLowerCase();

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const parsed = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function inferBidDates(termsText: string, bodyText: string) {
  const biddingStarts =
    termsText.match(/Bidding Starts:\s*([0-9/]+\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*[ap]m)/i)?.[1] ?? "";
  const biddingEnds =
    termsText.match(/Bidding Ends:\s*([0-9/]+\s+(?:between|at)\s+\d{1,2}:\d{2}(?::\d{2})?\s*[ap]m)/i)?.[1] ??
    "";

  const fallbackEnds =
    bodyText.match(/(?:ending|ends)\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*[ap]m)/i)?.[1] ??
    "";

  return {
    startAt: parseUsDateTimeToIso(biddingStarts),
    endAt: parseUsDateTimeToIso(biddingEnds || fallbackEnds),
  };
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

    const termsText = extractTermsText(html);
    const longText = `${description} ${scriptValues.join(" ")} ${termsText}`.replace(/\s+/g, " ");
    const images = extractLikelyImages(html);
    const locationFromTerms = inferLocationFromTerms(termsText);
    const locationFromBody = inferLocationFromText(title, longText);
    const location = {
      city: locationFromTerms.city || locationFromBody.city,
      region: locationFromTerms.region || locationFromBody.region,
    };
    const dates = inferBidDates(termsText, longText || title);

    let confidence = 68;
    if (termsText) confidence += 10;
    if (!location.city || !location.region) {
      confidence -= 15;
      warnings.push("Location could not be confidently extracted. Please verify city/state.");
    }
    if (!dates.startAt) {
      confidence -= 8;
      warnings.push("Start date was not confidently extracted. Please set it manually.");
    }
    if (!dates.endAt) {
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
        startAt: dates.startAt,
        endAt: dates.endAt,
        imageUrls: images,
      },
      debug: {
        scriptsScanned: scriptValues.length,
        termsDetected: Boolean(termsText),
        imageCount: images.length,
      },
    };
  },
};
