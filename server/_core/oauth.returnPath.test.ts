import { describe, expect, it } from "vitest";
import { getSafeReturnPathFromState } from "./oauth";

describe("OAuth return-path recovery", () => {
  it("restores a safe internal route after sign-in", () => {
    const state = Buffer.from(JSON.stringify({ returnPath: "/settings" })).toString("base64");
    expect(getSafeReturnPathFromState(state)).toBe("/settings");
  });

  it("rejects external, protocol-relative, malformed, and legacy state values", () => {
    const external = Buffer.from(JSON.stringify({ returnPath: "https://attacker.example" })).toString("base64");
    const protocolRelative = Buffer.from(JSON.stringify({ returnPath: "//attacker.example" })).toString("base64");
    expect(getSafeReturnPathFromState(external)).toBe("/");
    expect(getSafeReturnPathFromState(protocolRelative)).toBe("/");
    expect(getSafeReturnPathFromState("not-base64")).toBe("/");
    expect(getSafeReturnPathFromState(Buffer.from("https://legacy.example/callback").toString("base64"))).toBe("/");
  });
});
