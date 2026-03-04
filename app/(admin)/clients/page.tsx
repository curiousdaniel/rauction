import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container">
      <h1>Clients</h1>
      <p className="lead">Create clients and connect each Reddit account via OAuth.</p>

      <form className="card" method="POST" action="/api/clients">
        <h2>New Client</h2>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
        <label htmlFor="contactEmail">Contact Email</label>
        <input id="contactEmail" name="contactEmail" type="email" />
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} />
        <button type="submit">Create Client</button>
      </form>

      <div className="card">
        <h2>Client List</h2>
        {clients.length === 0 ? (
          <p>No clients yet.</p>
        ) : (
          <div className="stack">
            {clients.map((client) => (
              <div key={client.id} className="row">
                <div>
                  <p>
                    <strong>{client.name}</strong>
                  </p>
                  <p className="muted">
                    {client.redditUsername ? `Connected as u/${client.redditUsername}` : "Reddit not connected"}
                  </p>
                </div>
                <Link href={`/clients/${client.id}`}>Open</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
