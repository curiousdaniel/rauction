export type AuctionType = "ONLINE" | "LIVE";

export type AuctionDraft = {
  title: string;
  description: string;
  auctionUrl: string;
  moreInfoUrl?: string | null;
  locationCity: string;
  locationRegion: string;
  auctionType: AuctionType;
  startAt: string;
  endAt?: string | null;
  imageUrls: string[];
};

export function validateAuctionForScheduling(draft: AuctionDraft) {
  const errors: string[] = [];

  if (!draft.title.trim()) errors.push("Title is required.");
  if (!draft.description.trim()) errors.push("Description is required.");
  if (!draft.auctionUrl.trim()) errors.push("Auction URL is required.");
  if (!draft.locationCity.trim()) errors.push("Location city is required.");
  if (!draft.locationRegion.trim()) errors.push("Location region is required.");
  if (!draft.startAt.trim()) errors.push("Start datetime is required.");
  if (draft.auctionType === "ONLINE" && !draft.endAt?.trim()) {
    errors.push("End datetime is required for online auctions.");
  }

  const imageCount = draft.imageUrls.filter((url) => url.trim().length > 0).length;
  if (imageCount < 3) {
    errors.push("At least 3 image URLs are required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
