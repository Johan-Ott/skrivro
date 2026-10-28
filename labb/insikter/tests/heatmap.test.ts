// Ur tests/progress.test.ts. Importera heatmap från labb/insikter/src/project/heatmap.

describe("heatmap", () => {
  it("gives 12 weeks of days, Monday first, ending with the current week", () => {
    const cells = heatmap({}, "2026-10-02", 1000);

    expect(cells).toHaveLength(84);
    expect(cells[0]?.day).toBe("2026-07-13");
    expect(cells[83]?.day).toBe("2026-10-04");
  });

  it("shades a day by how much of the daily goal was written, and leaves the future empty", () => {
    const stats = { "2026-09-28": 200, "2026-09-29": 600, "2026-09-30": 1000, "2026-10-01": 1600 };

    const levels = heatmap(stats, "2026-10-02", 1000)
      .slice(77)
      .map((cell) => cell.level);

    expect(levels).toEqual([1, 2, 3, 4, 0, null, null]);
  });
});

