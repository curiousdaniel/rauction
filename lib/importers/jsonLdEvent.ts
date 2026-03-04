import type { ImportResult, Importer } from "@/lib/importers/types";

type JsonLdRecord = Record<string, unknown>;

function getScripts(html: string) {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  return Array.from(html.matchAll(regex)).map((match) => match[1]).filter(Boolean);
}

function normalizeImageField(input: unknown): string[] {
  if (typeof input === "string") return [input];
  if (Array.isArray(input)) {
    return input.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export const jsonLdEventImporter: Importer = {
  id: "json-ld-event",
  canHandle: (_url, html) => html.includes("application/ld+json"),
  async parse(url, html): Promise<ImportResult> {
    const blocks = getScripts(html);
    let picked: JsonLdRecord | null = null;

    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block) as unknown;
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        const eventLike = candidates.find((entry) => {
          if (!entry || typeof entry !== "object") return false;
          const typeValue = (entry as JsonLdRecord)["@type"];
          return typeof typeValue === "string" && typeValue.toLowerCase().includes("event");
        });
        if (eventLike && typeof eventLike === "object") {
          picked = eventLike as JsonLdRecord;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!picked) {
      return {
        provider: "jsonLdEvent",
        confidence: 20,
        warnings: ["No Event JSON-LD block found."],
        data: { auctionUrl: url.toString() },
      };
    }

    const location = (picked.location as JsonLdRecord | undefined)?.address as JsonLdRecord | undefined;

    return {
      provider: "jsonLdEvent",
      confidence: 70,
      warnings: ["Review imported fields before scheduling."],
      data: {
        title: typeof picked.name === "string" ? picked.name : "",
        description: typeof picked.description === "string" ? picked.description : "",
        auctionUrl: url.toString(),
        moreInfoUrl: url.toString(),
        startAt: typeof picked.startDate === "string" ? picked.startDate : "",
        endAt: typeof picked.endDate === "string" ? picked.endDate : null,
        locationCity:
          typeof location?.addressLocality === "string" ? location.addressLocality : "",
        locationRegion:
          typeof location?.addressRegion === "string" ? location.addressRegion : "",
        imageUrls: normalizeImageField(picked.image).slice(0, 3),
      },
      debug: { hasLocation: Boolean(location) },
    };
  },
};
