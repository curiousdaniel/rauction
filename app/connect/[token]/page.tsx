import { notFound } from "next/navigation";

import { verifyClientConnectInviteToken } from "@/lib/oauth/clientInvite";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ConnectPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ClientConnectPage({ params }: ConnectPageProps) {
  const { token } = await params;

  let clientId = "";
  try {
    clientId = verifyClientConnectInviteToken(token).clientId;
  } catch {
    return (
      <main className="container">
        <h1>Invalid Link</h1>
        <p className="lead">This Reddit connect link is invalid or expired.</p>
      </main>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, redditUsername: true },
  });

  if (!client) {
    notFound();
  }

  return (
    <main className="container">
      <h1>Connect Reddit Account</h1>
      <p className="lead">
        Connect Reddit for <strong>{client.name}</strong>.
      </p>
      <div className="card">
        <p>
          This link is only for connecting Reddit access. It does not provide access to internal
          AuctionMethod tools.
        </p>
        <a className="buttonLink" href={`/api/oauth/reddit/start/external?token=${encodeURIComponent(token)}`}>
          {client.redditUsername ? "Reconnect Reddit" : "Continue with Reddit"}
        </a>
      </div>
    </main>
  );
}
