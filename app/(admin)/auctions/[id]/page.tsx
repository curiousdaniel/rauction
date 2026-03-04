export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="container">
      <h1>Auction {id}</h1>
      <p className="lead">
        Auction detail/edit page scaffolded. Full CRUD and schedule workflow is next.
      </p>
    </main>
  );
}
