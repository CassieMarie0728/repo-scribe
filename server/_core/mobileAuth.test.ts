import { describe, expect, it } from "vitest";
import { requireMobileRedirectUri } from "./mobileAuth";

describe("mobile OAuth redirect validation", () => {
  it("accepts only the registered Repo Scribe deep-link callback", () => {
    expect(requireMobileRedirectUri("reposcribe://oauth?source=android").protocol).toBe("reposcribe:");
  });

  it("rejects web URLs, unregistered app hosts, and malformed callback values", () => {
    expect(() => requireMobileRedirectUri("https://attacker.example/callback")).toThrow("Unrecognized");
    expect(() => requireMobileRedirectUri("reposcribe://not-oauth")).toThrow("Unrecognized");
    expect(() => requireMobileRedirectUri(undefined)).toThrow("required");
  });
});
