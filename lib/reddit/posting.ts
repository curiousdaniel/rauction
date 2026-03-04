import { decryptToken } from "@/lib/crypto/encryption";

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_SUBMIT_URL = "https://oauth.reddit.com/api/submit";

type SubmitResponse = {
  json?: {
    errors?: unknown[];
    data?: {
      id?: string;
      name?: string;
      url?: string;
    };
  };
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export async function refreshRedditAccessToken(encryptedRefreshToken: string) {
  const clientId = requiredEnv("REDDIT_CLIENT_ID");
  const clientSecret = requiredEnv("REDDIT_CLIENT_SECRET");
  const refreshToken = decryptToken(encryptedRefreshToken);
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
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

  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Failed to refresh Reddit token (${response.status}): ${payload.error ?? "unknown error"}`);
  }

  return payload.access_token;
}

export async function submitRedditSelfPost(input: {
  accessToken: string;
  title: string;
  markdown: string;
}) {
  const body = new URLSearchParams({
    sr: "auction",
    kind: "self",
    title: input.title,
    text: input.markdown,
    api_type: "json",
  });

  const response = await fetch(REDDIT_SUBMIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "User-Agent": requiredEnv("REDDIT_USER_AGENT"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json()) as SubmitResponse;
  const errors = payload.json?.errors ?? [];
  if (!response.ok || errors.length > 0) {
    throw new Error(`Reddit submit failed (${response.status}): ${JSON.stringify(errors)}`);
  }

  const rawUrl = payload.json?.data?.url;
  const redditPostUrl = rawUrl?.startsWith("http")
    ? rawUrl
    : rawUrl
      ? `https://www.reddit.com${rawUrl}`
      : null;

  return {
    redditPostId: payload.json?.data?.id ?? payload.json?.data?.name ?? null,
    redditPostUrl,
  };
}
