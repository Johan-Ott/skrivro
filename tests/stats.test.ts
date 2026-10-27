import { describe, expect, it } from "vitest";
import {
  addWritten,
  dailyGoalOf,
  dayKey,
  readDeviceStats,
  readDeviceStatsOrSetAside,
  readStats,
  streak,
  wordsAdded,
  writeDeviceStats,
} from "../src/project/stats";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const scene = (body: string) => `---\nid: 01J9Z4K2QX\ntitle: Köket\n---\n${body}`;

describe("dayKey", () => {
  it("is the local date, so a late evening counts for that day", () => {
    const lateEvening = new Date(2026, 9, 3, 23, 30).getTime();

    const key = dayKey(lateEvening);

    expect(key).toBe("2026-10-03");
  });
});

describe("wordsAdded", () => {
  it("counts the words a save added to the scene body, not the front matter", () => {
    const before = scene("Brevet låg där.\n");
    const after = scene("Brevet låg där. Kuvertet var *gult*.\n").replace("Köket", "Köket nu");

    const added = wordsAdded(before, after);

    expect(added).toBe(3);
  });

  it("is negative when words were cut", () => {
    const added = wordsAdded(scene("Ett två tre.\n"), scene("Ett.\n"));

    expect(added).toBe(-2);
  });
});

describe("addWritten", () => {
  it("adds to the day and never goes below zero", () => {
    const stats = { "2026-10-03": 10 };

    const more = addWritten(stats, "2026-10-03", 5);
    const cut = addWritten(more, "2026-10-03", -40);

    expect(more).toEqual({ "2026-10-03": 15 });
    expect(cut).toEqual({ "2026-10-03": 0 });
  });
});

describe("streak", () => {
  const stats = { "2026-09-30": 100, "2026-10-01": 200, "2026-10-02": 50, "2026-09-28": 300 };

  it("counts the days in a row with words, up to yesterday when today is still empty", () => {
    const days = streak(stats, "2026-10-03");

    expect(days).toBe(3);
  });

  it("includes today once something is written", () => {
    const days = streak({ ...stats, "2026-10-03": 12 }, "2026-10-03");

    expect(days).toBe(4);
  });

  it("is zero after a day without words", () => {
    const days = streak(stats, "2026-10-04");

    expect(days).toBe(0);
  });
});

describe("stats per device", () => {
  it("keeps each device's words in its own file, so two devices never write the same one", async () => {
    const files = createMemoryFileSystem({});

    await writeDeviceStats(files, "/bok", "dator", { "2026-10-02": 812 });
    await writeDeviceStats(files, "/bok", "telefon", { "2026-10-02": 100, "2026-10-03": 50 });

    expect(await readDeviceStats(files, "/bok", "dator")).toEqual({ "2026-10-02": 812 });
    expect(JSON.parse(await files.readText("/bok/stats/telefon.json"))).toEqual({
      "2026-10-02": 100,
      "2026-10-03": 50,
    });
  });

  it("adds up every device and the older shared stats.json", async () => {
    const files = createMemoryFileSystem({ "/bok/stats.json": '{ "2026-10-01": 300 }' });
    await writeDeviceStats(files, "/bok", "dator", { "2026-10-02": 812 });
    await writeDeviceStats(files, "/bok", "telefon", { "2026-10-02": 100 });

    const stats = await readStats(files, "/bok");

    expect(stats).toEqual({ "2026-10-01": 300, "2026-10-02": 912 });
  });

  it("reads a missing or broken file as no statistics yet", async () => {
    const files = createMemoryFileSystem({
      "/trasig/stats.json": "{inte json",
      "/trasig/stats/dator.json": "[1, 2]",
    });

    const stats = [await readStats(files, "/saknas"), await readStats(files, "/trasig")];

    expect(stats).toEqual([{}, {}]);
  });
});

describe("dailyGoalOf", () => {
  it("reads the daily goal from project.json, or null without one", () => {
    const goals = [{ dailyGoal: 1000 }, {}, { dailyGoal: 0 }].map(dailyGoalOf);

    expect(goals).toEqual([1000, null, null]);
  });
});

describe("a device's own stats before words are added to them", () => {
  it("are none for a file that is missing, but an error for one that is there and cannot be read", async () => {
    const files = createMemoryFileSystem({ "/bok/stats/dator.json": "{ halv" });

    expect(await readDeviceStats(files, "/bok", "telefon")).toEqual({});
    await expect(readDeviceStats(files, "/bok", "dator")).rejects.toThrow();
  });

  it("are not written over when the file could not be read, so the days already counted stay", async () => {
    const files = createMemoryFileSystem({ "/bok/stats/dator.json": "{ halv" });

    await expect(readDeviceStats(files, "/bok", "dator")).rejects.toThrow();

    expect(await files.readText("/bok/stats/dator.json")).toBe("{ halv");
  });
});

describe("a device's stats file that cannot be read", () => {
  it("is put aside in trash/ and counting goes on from nothing, so the file is kept and not written over", async () => {
    const files = createMemoryFileSystem({ "/bok/stats/dator.json": "{ halv" });

    const own = await readDeviceStatsOrSetAside(files, "/bok", "dator");

    expect(own).toEqual({});
    expect(await files.readText("/bok/trash/dator.json")).toBe("{ halv");
    expect(await files.list("/bok/stats")).toEqual([]);
  });

  it("is read as it is when it is fine, or as nothing when it is missing", async () => {
    const files = createMemoryFileSystem({ "/bok/stats/dator.json": '{ "2026-10-02": 812 }' });

    expect(await readDeviceStatsOrSetAside(files, "/bok", "dator")).toEqual({ "2026-10-02": 812 });
    expect(await readDeviceStatsOrSetAside(files, "/bok", "telefon")).toEqual({});
  });
});

describe("a stats file that is fine but cannot be read just now", () => {
  it("is not put aside: a read error is not a broken file, and the days in it stay where they are", async () => {
    const files = createMemoryFileSystem({ "/bok/stats/dator.json": '{ "2026-10-02": 812 }' });
    const locked = {
      ...files,
      readText: async (path: string) => {
        if (path.includes("/stats/")) throw new Error("låst av synken");
        return files.readText(path);
      },
    };

    await expect(readDeviceStatsOrSetAside(locked, "/bok", "dator")).rejects.toThrow("låst");

    expect(await files.readText("/bok/stats/dator.json")).toContain("812");
    expect(await files.list("/bok")).not.toContain("trash");
  });
});
