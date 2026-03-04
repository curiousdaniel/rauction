import type { OAuthState } from "@prisma/client";
import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";

const REDDIT_AUTHORIZE_URL = "https://www.reddit.com/api/v1/authorize";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
};

type RedditMeResponse = {
  id: string;
  name: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export async function createOAuthState(clientId: string): Promise<OAuthState> {
  return prisma.oAuthState.create({
    data: {
      clientId,
      state: crypto.randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    },
  });
}

export function buildRedditAuthorizeUrl(state: string) {
  const clientId = requiredEnv("REDDIT_CLIENT_ID");
  const redirectUri = requiredEnv("REDDIT_REDIRECT_URI");
  const scope = encodeURIComponent("identity submit");
  const encodedRedirect = encodeURIComponent(redirectUri);
  const encodedState = encodeURIComponent(state);

  return `${REDDIT_AUTHORIZE_URL}?client_id=${encodeURIComponent(clientId)}&response_type=code&state=${encodedState}&redirect_uri=${encodedRedirect}&duration=permanent&scope=${scope}`;
}

export async function consumeOAuthState(state: string) {
  const record = await prisma.oAuthState.findFirst({
    where: {
      state,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      client: true,
    },
  });

  if (!record) {
    throw new Error("OAuth state is invalid, expired, or already used.");
  }

  return record;
}

export async function markOAuthStateUsed(id: string) {
  await prisma.oAuthState.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = requiredEnv("REDDIT_CLIENT_ID");
  const clientSecret = requiredEnv("REDDIT_CLIENT_SECRET");
  const redirectUri = requiredEnv("REDDIT_REDIRECT_URI");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": requiredEnv("REDDIT_USER_AGENT"),
    },
    body,
  });

  const payload = (await response.json()) as TokenResponse & { error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Reddit token exchange failed (${response.status}): ${payload.error ?? "unknown error"}`);
  }

  return payload;
}

export async function fetchRedditMe(accessToken: string): Promise<RedditMeResponse> {
  const response = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": requiredEnv("REDDIT_USER_AGENT"),
    },
  });

  const payload = (await response.json()) as RedditMeResponse;
  if (!response.ok || !payload.name || !payload.id) {
    throw new Error(`Failed to fetch Reddit profile (${response.status}).`);
  }

  return payload;
}
