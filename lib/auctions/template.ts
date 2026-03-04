import type { AuctionDraft } from "@/lib/auctions/validation";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return `${dateFormatter.format(parsed)} UTC`;
}

export function renderAuctionPostMarkdown(draft: AuctionDraft) {
  const featuredItems = "See auction page for full catalog.";
  const images = draft.imageUrls
    .filter((url) => url.trim().length > 0)
    .map((url) => `- ${url}`)
    .join("\n");

  return `${draft.description}

## Auction Details
- **Auction Type:** ${draft.auctionType}
- **Start:** ${formatDate(draft.startAt)}
- **End:** ${formatDate(draft.endAt)}
- **Location:** ${draft.locationCity}, ${draft.locationRegion}

## Featured Items
${featuredItems}

## Photos
${images}

## Bid / More Info
${draft.auctionUrl}
${draft.moreInfoUrl && draft.moreInfoUrl !== draft.auctionUrl ? draft.moreInfoUrl : ""}`.trim();
}

export function generateDefaultAuctionTitle(draft: Pick<AuctionDraft, "title" | "auctionType" | "locationCity" | "locationRegion" | "endAt" | "startAt">) {
  const shortTitle = draft.title.split("|")[0]?.trim() || "Auction";
  const endReference = draft.auctionType === "ONLINE" ? draft.endAt : draft.startAt;
  const dateText = formatDate(endReference).replace(" UTC", "");

  if (draft.auctionType === "ONLINE") {
    return `[AUCTION] ${shortTitle}, ${draft.locationCity}, ${draft.locationRegion}, ends ${dateText}`;
  }

  return `[AUCTION] ${shortTitle}, ${draft.locationCity}, ${draft.locationRegion}, ${dateText}`;
}
