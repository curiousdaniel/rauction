import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      auctions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!client) {
    notFound();
  }

  return (
    <main className="container">
      <h1>{client.name}</h1>
      <p className="lead">
        {client.redditUsername ? `Connected as u/${client.redditUsername}` : "Reddit not connected"}
      </p>

      <div className="grid">
        <form className="card" method="POST" action={`/api/clients/${client.id}`}>
          <h2>Edit Client</h2>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={client.name} required />
          <label htmlFor="contactEmail">Contact Email</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={client.contactEmail ?? ""}
          />
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={5} defaultValue={client.notes ?? ""} />
          <button type="submit">Save</button>
        </form>

        <div className="card">
          <h2>Reddit OAuth</h2>
          <p className="muted">Client authorizes once, then posts can be scheduled under their account.</p>
          <a className="buttonLink" href={`/api/oauth/reddit/start?clientId=${client.id}`}>
            {client.redditUsername ? "Reconnect Reddit" : "Connect Reddit"}
          </a>
          <p className="muted compact">
            Token last updated:{" "}
            {client.redditTokenUpdatedAt ? client.redditTokenUpdatedAt.toISOString() : "Never"}
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Auctions</h2>
        {client.auctions.length === 0 ? (
          <p>No auctions created for this client yet.</p>
        ) : (
          <div className="stack">
            {client.auctions.map((auction) => (
              <div key={auction.id} className="row">
                <div>
                  <p>
                    <strong>{auction.title}</strong>
                  </p>
                  <p className="muted">{auction.status}</p>
                </div>
                <Link href={`/auctions/${auction.id}`}>View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
