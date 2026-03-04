import { prisma } from "@/lib/prisma";
import { AuctionForm } from "@/app/(admin)/auctions/new/AuctionForm";

export const dynamic = "force-dynamic";

type NewAuctionPageProps = {
  searchParams?: Promise<{ error?: string; saved?: string }>;
};

function decodeError(errorCode: string) {
  const known: Record<string, string> = {
    "missing-client": "Please choose a client before saving.",
    "invalid-startAt": "Start date/time is required and must be valid.",
    "missing-scheduledAt": "Scheduled date/time is required for LIVE auctions when queueing.",
  };
  return known[errorCode] ?? errorCode;
}

export default async function NewAuctionPage({ searchParams }: NewAuctionPageProps) {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });
  const resolved = (await searchParams) ?? {};
  const errorMessage = resolved.error ? decodeError(resolved.error) : null;

  return (
    <main className="container">
      <h1>New Auction</h1>
      <p className="lead">Create a draft or queue an auction post.</p>

      {errorMessage ? (
        <div className="alert errorAlert">
          <strong>Could not queue auction.</strong> {errorMessage}
        </div>
      ) : null}

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
