const SAMPLE_PAYLOAD = `{
  "url": "https://example.com/auction/bidgallery"
}`;

export default function NewAuctionPage() {
  return (
    <main className="container">
      <h1>New Auction</h1>
      <p className="lead">
        This screen is scaffolded. Use the import API route directly while the full form is being built.
      </p>
      <div className="card">
        <h2>Import endpoint</h2>
        <p>
          POST <code>/api/import</code> with JSON body:
        </p>
        <pre>{SAMPLE_PAYLOAD}</pre>
      </div>
    </main>
  );
}
