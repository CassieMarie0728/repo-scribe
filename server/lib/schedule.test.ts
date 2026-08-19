import { describe, expect, it } from "vitest";
import {
  deriveScheduledExecutionStatus,
  getNextHeartbeatRun,
  hasRunInCurrentHeartbeatSlot,
  isValidHeartbeatCron,
} from "./schedule";

describe("platform schedule helpers", () => {
  it("accepts valid six-field UTC schedules with zero seconds", () => {
    expect(isValidHeartbeatCron("0 0 9 * * *")).toBe(true);
    expect(isValidHeartbeatCron("0 0 0 * * 1-5")).toBe(true);
  });

  it("rejects legacy five-field, sub-minute, and malformed schedules", () => {
    expect(isValidHeartbeatCron("0 9 * * *")).toBe(false);
    expect(isValidHeartbeatCron("*/30 * * * * *")).toBe(false);
    expect(isValidHeartbeatCron("0 99 9 * * *")).toBe(false);
  });

  it("calculates a future run in UTC and prevents a duplicate retry in the same daily slot", () => {
    const now = new Date("2026-08-19T09:00:30.000Z");
    expect(getNextHeartbeatRun("0 0 9 * * *", now).toISOString()).toBe("2026-08-20T09:00:00.000Z");
    expect(
      hasRunInCurrentHeartbeatSlot(
        "0 0 9 * * *",
        new Date("2026-08-19T09:00:04.000Z"),
        new Date("2026-08-19T09:01:03.000Z")
      )
    ).toBe(true);
  });

  it("marks mixed regeneration results as partial rather than failed", () => {
    expect(deriveScheduledExecutionStatus(2, 0)).toBe("success");
    expect(deriveScheduledExecutionStatus(1, 1)).toBe("partial");
    expect(deriveScheduledExecutionStatus(0, 2)).toBe("failed");
  });
});
