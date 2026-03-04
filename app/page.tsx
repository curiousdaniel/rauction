import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1>AuctionMethod Reddit Posting POC</h1>
      <p className="lead">
        App scaffold is ready. Start from the internal admin pages below.
      </p>
      <div className="grid">
        <Link className="card" href="/clients">
          <h2>Clients</h2>
          <p>Create and manage client records and Reddit account connections.</p>
        </Link>
        <Link className="card" href="/auctions">
          <h2>Auctions</h2>
          <p>Create auctions manually or import via URL before scheduling.</p>
        </Link>
        <Link className="card" href="/auctions/new">
          <h2>New Auction</h2>
          <p>Start a draft and test the new URL import route.</p>
        </Link>
        <Link className="card" href="/settings">
          <h2>Settings</h2>
          <p>Configure app and environment values for OAuth and cron.</p>
        </Link>
      </div>
    </main>
  );
}
