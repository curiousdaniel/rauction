import { NextResponse } from "next/server";

import { verifyClientConnectInviteToken } from "@/lib/oauth/clientInvite";
import { buildRedditAuthorizeUrl, createOAuthState } from "@/lib/reddit/oauth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }

  try {
    const parsed = verifyClientConnectInviteToken(token);
    const stateRow = await createOAuthState(parsed.clientId, {
      source: "client_invite",
      redirectTo: "/connect/success",
    });
    const authorizeUrl = buildRedditAuthorizeUrl(stateRow.state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
