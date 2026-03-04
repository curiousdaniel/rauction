import { NextResponse } from "next/server";

import { buildRedditAuthorizeUrl, createOAuthState } from "@/lib/reddit/oauth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  try {
    const stateRow = await createOAuthState(clientId);
    const authorizeUrl = buildRedditAuthorizeUrl(stateRow.state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
