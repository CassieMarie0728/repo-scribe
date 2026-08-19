import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { sdk } from "./sdk";
import { getMobileBearerToken, verifyMobileAccessToken } from "./mobileAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    const mobileToken = getMobileBearerToken(opts.req);
    const mobileUserId = mobileToken ? await verifyMobileAccessToken(mobileToken) : null;
    user = mobileUserId ? (await getUserById(mobileUserId) ?? null) : null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
