import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const expectedToken = process.env.CRON_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Invalid cron token." }, { status: 401 });
  }

  return NextResponse.json({
    message: "Cron worker route scaffolded. Queue processing will be added next.",
    processed: 0,
  });
}
