import type { ImportResult, Importer } from "@/lib/importers/types";

function pickMeta(content: string, propertyName: string) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  return content.match(regex)?.[1]?.trim();
}

function pickMetaMany(content: string, propertyName: string) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "gi",
  );
  const values = Array.from(content.matchAll(regex))
    .map((entry) => entry[1]?.trim())
    .filter(Boolean) as string[];
  return values;
}

export const openGraphImporter: Importer = {
  id: "open-graph",
  canHandle: () => true,
  async parse(url, html): Promise<ImportResult> {
    const title = pickMeta(html, "og:title");
    const description = pickMeta(html, "og:description");
    const images = pickMetaMany(html, "og:image").slice(0, 3);
    const canonical = pickMeta(html, "og:url");

    return {
      provider: "openGraph",
      confidence: title ? 55 : 30,
      warnings: [
        "OpenGraph import may miss auction dates and location.",
        ...(images.length < 3 ? ["Fewer than 3 images were found."] : []),
      ],
      data: {
        title: title ?? "",
        description: description ?? "",
        auctionUrl: canonical ?? url.toString(),
        moreInfoUrl: canonical ?? url.toString(),
        imageUrls: images,
      },
    };
  },
};
