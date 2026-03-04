import { NextResponse } from "next/server";

import { processDueAuctions } from "@/lib/cron/processDueAuctions";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const expectedToken = process.env.CRON_TOKEN || process.env.CRON_SECRET;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Invalid cron token." }, { status: 401 });
  }

  const result = await processDueAuctions();
  return NextResponse.json(result);
}
