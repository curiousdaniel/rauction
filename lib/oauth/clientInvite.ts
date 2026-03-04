import crypto from "node:crypto";

const PURPOSE = "reddit_connect";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

type InvitePayload = {
  clientId: string;
  exp: number;
  nonce: string;
  purpose: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getSecretBuffer() {
  return Buffer.from(requiredEnv("OAUTH_CONNECT_LINK_SECRET"), "utf8");
}

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadPart: string) {
  return crypto.createHmac("sha256", getSecretBuffer()).update(payloadPart).digest("base64url");
}

export function createClientConnectInviteToken(clientId: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const payload: InvitePayload = {
    clientId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    nonce: crypto.randomBytes(12).toString("hex"),
    purpose: PURPOSE,
  };

  const payloadPart = base64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadPart);
  return `${payloadPart}.${signature}`;
}

export function verifyClientConnectInviteToken(token: string) {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) {
    throw new Error("Invalid connect token format.");
  }

  const expectedSig = sign(payloadPart);
  const sigBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSig, "base64url");
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid connect token signature.");
  }

  let parsed: InvitePayload;
  try {
    parsed = JSON.parse(base64urlDecode(payloadPart)) as InvitePayload;
  } catch {
    throw new Error("Invalid connect token payload.");
  }

  if (parsed.purpose !== PURPOSE) {
    throw new Error("Invalid connect token purpose.");
  }
  if (!parsed.clientId) {
    throw new Error("Connect token missing client id.");
  }
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Connect token expired.");
  }

  return parsed;
}
