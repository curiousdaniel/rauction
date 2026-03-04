import { NextResponse } from "next/server";

import { processDueAuctions } from "@/lib/cron/processDueAuctions";

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET || process.env.CRON_TOKEN;
  if (!expectedSecret) {
    // If no secret is configured, allow requests that Vercel marks as cron.
    return request.headers.get("x-vercel-cron") === "1";
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return bearer === expectedSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Invalid cron authentication." }, { status: 401 });
  }

  const result = await processDueAuctions();
  return NextResponse.json(result);
}
