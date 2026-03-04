import { NextResponse } from "next/server";

import { encryptToken } from "@/lib/crypto/encryption";
import { prisma } from "@/lib/prisma";
import {
  consumeOAuthState,
  exchangeCodeForTokens,
  fetchRedditMe,
  markOAuthStateUsed,
} from "@/lib/reddit/oauth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (!state || !code) {
    return NextResponse.json({ error: "Missing OAuth state or code." }, { status: 400 });
  }

  try {
    const stateRow = await consumeOAuthState(state);
    const tokens = await exchangeCodeForTokens(code);
    const me = await fetchRedditMe(tokens.access_token);

    const updateData: {
      redditUsername: string;
      redditUserId: string;
      redditScope: string;
      redditTokenUpdatedAt: Date;
      redditRefreshTokenEnc?: string;
    } = {
      redditUsername: me.name,
      redditUserId: me.id,
      redditScope: tokens.scope,
      redditTokenUpdatedAt: new Date(),
    };

    if (tokens.refresh_token) {
      updateData.redditRefreshTokenEnc = encryptToken(tokens.refresh_token);
    }

    await prisma.client.update({
      where: { id: stateRow.clientId },
      data: updateData,
    });

    await markOAuthStateUsed(stateRow.id);

    return NextResponse.redirect(new URL(`/clients/${stateRow.clientId}?connected=1`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
