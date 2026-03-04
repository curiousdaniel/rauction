import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewAuctionPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="container">
      <h1>New Auction</h1>
      <p className="lead">Create a draft or queue an auction post.</p>

      {clients.length === 0 ? (
        <div className="card">
          <p>Create at least one client before creating auctions.</p>
        </div>
      ) : (
        <form className="card" method="POST" action="/api/auctions">
          <label htmlFor="clientId">Client</label>
          <select id="clientId" name="clientId" defaultValue={clients[0]?.id} required>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <label htmlFor="title">Post Title</label>
          <input id="title" name="title" required />

          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={5} required />

          <div className="formGrid2">
            <div>
              <label htmlFor="auctionType">Auction Type</label>
              <select id="auctionType" name="auctionType" defaultValue="ONLINE">
                <option value="ONLINE">ONLINE</option>
                <option value="LIVE">LIVE</option>
              </select>
            </div>
            <div>
              <label htmlFor="scheduledAt">Scheduled At (UTC/local browser time)</label>
              <input id="scheduledAt" name="scheduledAt" type="datetime-local" />
            </div>
          </div>

          <div className="formGrid2">
            <div>
              <label htmlFor="startAt">Start At</label>
              <input id="startAt" name="startAt" type="datetime-local" required />
            </div>
            <div>
              <label htmlFor="endAt">End At (required for ONLINE)</label>
              <input id="endAt" name="endAt" type="datetime-local" />
            </div>
          </div>

          <label htmlFor="auctionUrl">Auction URL</label>
          <input id="auctionUrl" name="auctionUrl" type="url" required />

          <label htmlFor="moreInfoUrl">More Info URL (optional)</label>
          <input id="moreInfoUrl" name="moreInfoUrl" type="url" />

          <div className="formGrid2">
            <div>
              <label htmlFor="locationCity">City</label>
              <input id="locationCity" name="locationCity" required />
            </div>
            <div>
              <label htmlFor="locationRegion">State / Region</label>
              <input id="locationRegion" name="locationRegion" required />
            </div>
          </div>

          <label htmlFor="imageUrls">Image URLs (one per line, min 3)</label>
          <textarea id="imageUrls" name="imageUrls" rows={4} required />

          <label htmlFor="featuredItems">Featured Items (optional, one per line)</label>
          <textarea id="featuredItems" name="featuredItems" rows={3} />

          <div className="actionsRow">
            <button type="submit" name="submitAction" value="saveDraft">
              Save Draft
            </button>
            <button type="submit" name="submitAction" value="queue">
              Save and Queue
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
