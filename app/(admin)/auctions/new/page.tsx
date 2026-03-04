import { prisma } from "@/lib/prisma";
import { AuctionForm } from "@/app/(admin)/auctions/new/AuctionForm";

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
        <AuctionForm clients={clients} />
      )}
    </main>
  );
}
