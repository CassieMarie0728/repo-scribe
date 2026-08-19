import { CronExpressionParser } from "cron-parser";

/** Convert a legacy minute-based cron into the platform's explicit seconds format. */
export function normalizeHeartbeatCron(expression: string): string {
  const fields = expression.trim().split(/\s+/);
  return fields.length === 5 ? `0 ${fields.join(" ")}` : fields.join(" ");
}
/** Platform schedules are six-field UTC crons and intentionally require second zero. */
export function isValidHeartbeatCron(expression: string): boolean {
  const normalized = normalizeHeartbeatCron(expression);
  const fields = normalized.split(/\s+/);
  if (fields.length !== 6 || fields[0] !== "0") return false;

  try {
    CronExpressionParser.parse(normalized, { tz: "UTC" });
    return true;
  } catch {
    return false;
  }
}

export function getNextHeartbeatRun(expression: string, fromDate = new Date()): Date {
  const normalized = normalizeHeartbeatCron(expression);
  if (!isValidHeartbeatCron(normalized)) {
    throw new Error("Schedule must be a valid six-field UTC cron expression with seconds set to 0");
  }

  return CronExpressionParser
    .parse(normalized, { currentDate: fromDate, tz: "UTC" })
    .next()
    .toDate();
}

export function getCurrentHeartbeatSlot(expression: string, now = new Date()): Date {
  const normalized = normalizeHeartbeatCron(expression);
  if (!isValidHeartbeatCron(normalized)) {
    throw new Error("Schedule must be a valid six-field UTC cron expression with seconds set to 0");
  }

  return CronExpressionParser
    .parse(normalized, { currentDate: new Date(now.getTime() + 1_000), tz: "UTC" })
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
