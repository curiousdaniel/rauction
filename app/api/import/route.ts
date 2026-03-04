import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { runAuctionImport } from "@/lib/importers";

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

const requestSchema = z.object({
  url: z.string().url(),
});

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "auctionmethod-r-auction-poc/0.1 importer",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const html = await response.text();
    const bytes = new TextEncoder().encode(html).byteLength;
    if (bytes > MAX_HTML_BYTES) {
      throw new Error("HTML response exceeded 2MB max size.");
    }

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const parsedBody = requestSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { url } = parsedBody.data;
  const safeProtocol = /^https?:\/\//i.test(url);
  if (!safeProtocol) {
    return NextResponse.json({ error: "Only http and https URLs are allowed." }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    const html = await fetchHtml(targetUrl.toString());
    const result = await runAuctionImport(targetUrl, html);

    await prisma.importRun.create({
      data: {
        sourceUrl: targetUrl.toString(),
        provider: result.provider,
        confidence: result.confidence,
        warnings: result.warnings,
        extracted: result.data,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
