import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await prisma.auction.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="container">
      <h1>Auctions</h1>
      <p className="lead">Review drafts, queued posts, and posting results.</p>
      <Link className="card" href="/auctions/new">
        <h2>Create Auction</h2>
        <p>Start a new draft with manual entry or URL import.</p>
      </Link>
      <div className="card stack">
        <h2>Recent Auctions</h2>
        {auctions.length === 0 ? (
          <p>No auctions yet.</p>
        ) : (
          auctions.map((auction) => (
            <div key={auction.id} className="row">
              <div>
                <p>
                  <strong>{auction.title}</strong>
                </p>
                <p className="muted">
                  {auction.client.name} - {auction.status}
                </p>
              </div>
              <Link href={`/auctions/${auction.id}`}>Open</Link>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
