import { notFound } from "next/navigation";

import { renderAuctionPostMarkdown } from "@/lib/auctions/template";
import { validateAuctionForScheduling } from "@/lib/auctions/validation";
import { prisma } from "@/lib/prisma";

function toDateTimeLocal(value: Date | null) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!auction) {
    notFound();
  }

  const draft = {
    title: auction.title,
    description: auction.description,
    auctionUrl: auction.auctionUrl,
    moreInfoUrl: auction.moreInfoUrl,
    locationCity: auction.locationCity,
    locationRegion: auction.locationRegion,
    auctionType: auction.auctionType,
    startAt: auction.startAt.toISOString(),
    endAt: auction.endAt?.toISOString(),
    imageUrls: auction.imageUrls,
  };
  const validation = validateAuctionForScheduling(draft);
  const markdownPreview = renderAuctionPostMarkdown(draft);

  return (
    <main className="container">
      <h1>{auction.title}</h1>
      <p className="lead">
        Status: {auction.status} | Client: {auction.client.name}
      </p>

      <form className="card" method="POST" action={`/api/auctions/${auction.id}`}>
        <label htmlFor="title">Post Title</label>
        <input id="title" name="title" defaultValue={auction.title} required />

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={5} defaultValue={auction.description} required />

        <div className="formGrid2">
          <div>
            <label htmlFor="auctionType">Auction Type</label>
            <select id="auctionType" name="auctionType" defaultValue={auction.auctionType}>
              <option value="ONLINE">ONLINE</option>
              <option value="LIVE">LIVE</option>
            </select>
          </div>
          <div>
            <label htmlFor="scheduledAt">Scheduled At</label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(auction.scheduledAt)}
            />
          </div>
        </div>

        <div className="formGrid2">
          <div>
            <label htmlFor="startAt">Start At</label>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(auction.startAt)}
              required
            />
          </div>
          <div>
            <label htmlFor="endAt">End At</label>
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(auction.endAt)}
            />
          </div>
        </div>

        <label htmlFor="auctionUrl">Auction URL</label>
        <input id="auctionUrl" name="auctionUrl" type="url" defaultValue={auction.auctionUrl} required />

        <label htmlFor="moreInfoUrl">More Info URL</label>
        <input id="moreInfoUrl" name="moreInfoUrl" type="url" defaultValue={auction.moreInfoUrl ?? ""} />

        <div className="formGrid2">
          <div>
            <label htmlFor="locationCity">City</label>
            <input id="locationCity" name="locationCity" defaultValue={auction.locationCity} required />
          </div>
          <div>
            <label htmlFor="locationRegion">State / Region</label>
            <input id="locationRegion" name="locationRegion" defaultValue={auction.locationRegion} required />
          </div>
        </div>

        <label htmlFor="imageUrls">Image URLs (one per line)</label>
        <textarea id="imageUrls" name="imageUrls" rows={4} defaultValue={auction.imageUrls.join("\n")} />

        <label htmlFor="featuredItems">Featured Items (one per line)</label>
        <textarea id="featuredItems" name="featuredItems" rows={3} defaultValue={auction.featuredItems.join("\n")} />

        <div className="actionsRow">
          <button type="submit" name="submitAction" value="saveDraft">
            Save Draft
          </button>
          <button type="submit" name="submitAction" value="queue">
            Queue for Posting
          </button>
          <button type="submit" name="submitAction" value="cancel">
            Cancel
          </button>
          <button type="submit" name="submitAction" value="retry">
            Retry
          </button>
        </div>
      </form>

      <div className="card">
        <h2>Validation</h2>
        {validation.isValid ? (
          <p>Ready to schedule.</p>
        ) : (
          <ul className="inlineList">
            {validation.errors.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Post Preview</h2>
        <pre>{markdownPreview}</pre>
      </div>

      <div className="card">
        <h2>Posting Result</h2>
        <p className="muted">Attempts: {auction.attemptCount}</p>
        <p className="muted">Last Error: {auction.lastError ?? "None"}</p>
        <p className="muted">
          Reddit URL:{" "}
          {auction.redditPostUrl ? (
            <a href={auction.redditPostUrl} target="_blank" rel="noreferrer">
              {auction.redditPostUrl}
            </a>
          ) : (
            "Not posted yet"
          )}
        </p>
      </div>
    </main>
  );
}
