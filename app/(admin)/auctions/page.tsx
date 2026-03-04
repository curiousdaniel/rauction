import Link from "next/link";

export default function AuctionsPage() {
  return (
    <main className="container">
      <h1>Auctions</h1>
      <p className="lead">Filter by status and review posting lifecycle here.</p>
      <Link className="card" href="/auctions/new">
        <h2>Create Auction</h2>
        <p>Start a new draft with manual entry or URL import.</p>
      </Link>
    </main>
  );
}
