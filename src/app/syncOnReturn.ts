const LEAST_APART_MS = 30_000;

/** Coming back to the app shows what the other device wrote, but switching windows back and forth
 * does not start a sync each time. */
export const isTimeToSyncOnReturn = (lastRunAt: number | null, now: number) =>
  lastRunAt === null || now - lastRunAt >= LEAST_APART_MS;
