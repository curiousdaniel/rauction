import { AuctionStatus, AuctionType } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateAuctionForScheduling } from "@/lib/auctions/validation";
import { prisma } from "@/lib/prisma";

function parseDateOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const submitAction = String(form.get("submitAction") ?? "saveDraft");

  const clientId = String(form.get("clientId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const auctionUrl = String(form.get("auctionUrl") ?? "").trim();
  const moreInfoUrl = String(form.get("moreInfoUrl") ?? "").trim();
  const locationCity = String(form.get("locationCity") ?? "").trim();
  const locationRegion = String(form.get("locationRegion") ?? "").trim();
  const auctionTypeRaw = String(form.get("auctionType") ?? "ONLINE").trim();
  const startAtRaw = String(form.get("startAt") ?? "").trim();
  const endAtRaw = String(form.get("endAt") ?? "").trim();
  const scheduledAtRaw = String(form.get("scheduledAt") ?? "").trim();
  const imageUrlsRaw = String(form.get("imageUrls") ?? "");
  const featuredItemsRaw = String(form.get("featuredItems") ?? "");

  if (!clientId) {
    return NextResponse.redirect(new URL("/auctions/new?error=missing-client", request.url), 303);
  }

  const auctionType = auctionTypeRaw === "LIVE" ? AuctionType.LIVE : AuctionType.ONLINE;
  const startAt = parseDateOrNull(startAtRaw);
  if (!startAt) {
    return NextResponse.redirect(new URL("/auctions/new?error=invalid-startAt", request.url), 303);
  }

  const endAt = parseDateOrNull(endAtRaw);
  let scheduledAt = parseDateOrNull(scheduledAtRaw);
  const imageUrls = splitLines(imageUrlsRaw);
  const featuredItems = splitLines(featuredItemsRaw);

  let status: AuctionStatus = AuctionStatus.DRAFT;
  if (submitAction === "queue") {
    const check = validateAuctionForScheduling({
      title,
      description,
      auctionUrl,
      moreInfoUrl,
      locationCity,
      locationRegion,
      auctionType,
      startAt: startAt.toISOString(),
      endAt: endAt?.toISOString(),
      imageUrls,
    });

    if (!check.isValid) {
      return NextResponse.redirect(new URL(`/auctions/new?error=${encodeURIComponent(check.errors[0])}`, request.url), 303);
    }

    if (!scheduledAt && auctionType === AuctionType.ONLINE) {
      // For online auctions, default post timing to auction start when no manual schedule is provided.
      scheduledAt = startAt;
    }

    if (!scheduledAt) {
      return NextResponse.redirect(new URL("/auctions/new?error=missing-scheduledAt", request.url), 303);
    }

    status = AuctionStatus.QUEUED;
  }

  const created = await prisma.auction.create({
    data: {
      clientId,
      sourceUrl: null,
      auctionUrl,
      moreInfoUrl: moreInfoUrl || null,
      title,
      description,
      auctionType,
      startAt,
      endAt,
      locationCity,
      locationRegion,
      imageUrls,
      featuredItems,
      scheduledAt,
      status,
    },
  });

  return NextResponse.redirect(new URL(`/auctions/${created.id}`, request.url), 303);
}
