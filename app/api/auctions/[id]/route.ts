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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const form = await request.formData();
  const submitAction = String(form.get("submitAction") ?? "saveDraft");

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

  const auctionType = auctionTypeRaw === "LIVE" ? AuctionType.LIVE : AuctionType.ONLINE;
  const startAt = parseDateOrNull(startAtRaw);
  if (!startAt) {
    return NextResponse.redirect(new URL(`/auctions/${id}?error=invalid-startAt`, request.url));
  }

  const endAt = parseDateOrNull(endAtRaw);
  const scheduledAt = parseDateOrNull(scheduledAtRaw);
  const imageUrls = splitLines(imageUrlsRaw);
  const featuredItems = splitLines(featuredItemsRaw);

  const nextStatus =
    submitAction === "queue"
      ? AuctionStatus.QUEUED
      : submitAction === "cancel"
        ? AuctionStatus.CANCELLED
        : submitAction === "retry"
          ? AuctionStatus.QUEUED
          : AuctionStatus.DRAFT;

  if (nextStatus === AuctionStatus.QUEUED) {
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
      return NextResponse.redirect(new URL(`/auctions/${id}?error=${encodeURIComponent(check.errors[0])}`, request.url));
    }

    if (!scheduledAt) {
      return NextResponse.redirect(new URL(`/auctions/${id}?error=missing-scheduledAt`, request.url));
    }
  }

  await prisma.auction.update({
    where: { id },
    data: {
      title,
      description,
      auctionUrl,
      moreInfoUrl: moreInfoUrl || null,
      locationCity,
      locationRegion,
      auctionType,
      startAt,
      endAt,
      scheduledAt,
      imageUrls,
      featuredItems,
      status: nextStatus,
      lastError: nextStatus === AuctionStatus.DRAFT ? null : undefined,
    },
  });

  return NextResponse.redirect(new URL(`/auctions/${id}?saved=1`, request.url));
}
