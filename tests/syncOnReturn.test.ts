import { describe, expect, it } from "vitest";
import { isTimeToSyncOnReturn } from "../src/app/syncOnReturn";

describe("isTimeToSyncOnReturn", () => {
  it("syncs when the app comes back after it has been away a while, or has not synced yet", () => {
    expect(isTimeToSyncOnReturn(null, 1_000_000)).toBe(true);
    expect(isTimeToSyncOnReturn(1_000_000, 1_000_000 + 5 * 60_000)).toBe(true);
  });

  it("does not sync again at once when the writer only switches windows and back", () => {
    expect(isTimeToSyncOnReturn(1_000_000, 1_000_000 + 5_000)).toBe(false);
  });
});
