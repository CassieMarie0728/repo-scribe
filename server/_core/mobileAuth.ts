import type { Request } from "express";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "./env";

const MOBILE_AUDIENCE = "repo-scribe-mobile";
const MOBILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const MOBILE_REDIRECT_PROTOCOL = "reposcribe:";
const MOBILE_REDIRECT_HOST = "oauth";

function getSecret() {
  if (!ENV.cookieSecret) throw new Error("Mobile authentication is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function requireMobileRedirectUri(value: unknown): URL {
  if (typeof value !== "string" || value.length > 512) {
    throw new Error("A mobile redirect URI is required");
  }
  const redirectUri = new URL(value);
  if (redirectUri.protocol !== MOBILE_REDIRECT_PROTOCOL || redirectUri.hostname !== MOBILE_REDIRECT_HOST) {
    throw new Error("Unrecognized mobile redirect URI");
  }
  return redirectUri;
}

export async function issueMobileAccessToken(userId: number, openId: string): Promise<string> {
  return new SignJWT({ tokenType: "mobile", userId, openId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(MOBILE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MOBILE_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyMobileAccessToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      audience: MOBILE_AUDIENCE,
    });
    const userId = payload.userId;
    if (payload.tokenType !== "mobile" || typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}

export function getMobileBearerToken(req: Request): string | null {
  const value = req.header("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token.length > 0 && token.length <= 4096 ? token : null;
}
