import cronParser from "cron-parser";

/** Platform schedules are six-field UTC crons and intentionally require second zero. */
export function isValidHeartbeatCron(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 6 || fields[0] !== "0") return false;

  try {
    cronParser.parse(expression, { tz: "UTC" });
    return true;
  } catch {
    return false;
  }
}

export function getNextHeartbeatRun(expression: string, fromDate = new Date()): Date {
  if (!isValidHeartbeatCron(expression)) {
    throw new Error("Schedule must be a valid six-field UTC cron expression with seconds set to 0");
  }

  return cronParser
    .parse(expression, { currentDate: fromDate, tz: "UTC" })
    .next()
    .toDate();
}

export function getCurrentHeartbeatSlot(expression: string, now = new Date()): Date {
  if (!isValidHeartbeatCron(expression)) {
    throw new Error("Schedule must be a valid six-field UTC cron expression with seconds set to 0");
  }

  return cronParser
    .parse(expression, { currentDate: new Date(now.getTime() + 1_000), tz: "UTC" })
    .prev()
    .toDate();
}

/**
 * Heartbeat may retry a failed delivery. For the app's supported hourly-or-lower
 * schedules, a completed run at or after the same calculated cron slot is a no-op.
 */
export function hasRunInCurrentHeartbeatSlot(
  expression: string,
  lastRun: Date | null | undefined,
  now = new Date()
): boolean {
  if (!lastRun || !isValidHeartbeatCron(expression)) return false;

  try {
    const currentSlot = getCurrentHeartbeatSlot(expression, now);
    return lastRun.getTime() >= currentSlot.getTime();
  } catch {
    return false;
  }
}

export function deriveScheduledExecutionStatus(successCount: number, failureCount: number) {
  if (failureCount === 0) return "success" as const;
  if (successCount === 0) return "failed" as const;
  return "partial" as const;
}
