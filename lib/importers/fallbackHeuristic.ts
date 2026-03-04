import type { ImportResult, Importer } from "@/lib/importers/types";

function readTag(html: string, tag: "title" | "h1") {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return html.match(regex)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
}

export const fallbackHeuristicImporter: Importer = {
  id: "fallback-heuristic",
  canHandle: () => true,
  async parse(url, html): Promise<ImportResult> {
    const title = readTag(html, "h1") || readTag(html, "title");
    const lower = html.toLowerCase();
    const auctionType = lower.includes("online auction") || lower.includes("bidding starts")
      ? "ONLINE"
      : "LIVE";

    return {
      provider: "fallback",
      confidence: 25,
      warnings: [
        "Low confidence import. Please verify dates, location, and images.",
        "Fallback parser used generic page signals only.",
      ],
      data: {
        title,
        description: "",
        auctionUrl: url.toString(),
        moreInfoUrl: url.toString(),
        auctionType,
      },
    };
  },
};
