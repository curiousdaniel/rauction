import { AuctionStatus } from "@prisma/client";

import { renderAuctionPostMarkdown } from "@/lib/auctions/template";
import { prisma } from "@/lib/prisma";
import { refreshRedditAccessToken, submitRedditSelfPost } from "@/lib/reddit/posting";

async function markAuctionFailed(id: string, message: string) {
  await prisma.auction.update({
    where: { id },
    data: {
      status: AuctionStatus.FAILED,
      lastError: message.slice(0, 1000),
    },
  });
}

export async function processDueAuctions() {
  const dueAuctions = await prisma.auction.findMany({
    where: {
      status: AuctionStatus.QUEUED,
      scheduledAt: { lte: new Date() },
    },
    include: {
      client: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });

  let processed = 0;
  let posted = 0;
  let failed = 0;

  for (const auction of dueAuctions) {
    const lock = await prisma.auction.updateMany({
      where: {
        id: auction.id,
        status: AuctionStatus.QUEUED,
      },
      data: {
        status: AuctionStatus.PROCESSING,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    if (lock.count === 0) {
      continue;
    }

    processed += 1;

    try {
      if (!auction.client.redditRefreshTokenEnc) {
        throw new Error("Client has no Reddit refresh token saved.");
      }

      const accessToken = await refreshRedditAccessToken(auction.client.redditRefreshTokenEnc);
      const markdown = renderAuctionPostMarkdown({
        title: auction.title,
        description: auction.description,
        auctionUrl: auction.auctionUrl,
        moreInfoUrl: auction.moreInfoUrl,
        locationCity: auction.locationCity,
        locationRegion: auction.locationRegion,
        auctionType: auction.auctionType,
        startAt: auction.startAt.toISOString(),
        endAt: auction.endAt?.toISOString(),
        imageUrls: auction.imageUrls,
      });

      const postResult = await submitRedditSelfPost({
        accessToken,
        title: auction.title,
        markdown,
      });

      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          status: AuctionStatus.POSTED,
          redditPostId: postResult.redditPostId,
          redditPostUrl: postResult.redditPostUrl,
          postedAt: new Date(),
          lastError: null,
        },
      });

      posted += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown posting error";
      await markAuctionFailed(auction.id, message);
    }
  }

  return { processed, posted, failed };
}
