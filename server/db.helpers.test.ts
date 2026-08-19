import { describe, expect, it } from "vitest";
import { getRequiredInsertId, normalizeGenerationIds } from "./db";

describe("database integrity helpers", () => {
  it("keeps only unique positive safe primary keys for scoped membership queries", () => {
    expect(
      normalizeGenerationIds([7, 3, 7, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    ).toEqual([7, 3]);
  });

  it("uses the database insert result instead of relying on a time-ordered reselect", () => {
    expect(getRequiredInsertId({ insertId: 42 }, "generation")).toBe(42);
    expect(getRequiredInsertId({ insertId: BigInt(43) }, "generation")).toBe(43);
    expect(getRequiredInsertId([{ insertId: 44 }], "generation")).toBe(44);
  });

  it("rejects absent and invalid insert identifiers rather than returning the wrong record", () => {
    expect(() => getRequiredInsertId({}, "generation")).toThrow("valid generation ID");
    expect(() => getRequiredInsertId({ insertId: 0 }, "generation")).toThrow("valid generation ID");
    expect(() => getRequiredInsertId({ insertId: -3 }, "generation")).toThrow("valid generation ID");
  });
});
