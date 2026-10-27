import { describe, expect, it } from "vitest";
import type { Stroke } from "../src/project/stickyNotes";
import { placeInRoom, rubOut } from "../src/project/stickyNoteGeometry";

describe("rubOut", () => {
  const across: Stroke = [
    [0, 50],
    [100, 50],
  ];
  const elsewhere: Stroke = [
    [0, 10],
    [100, 10],
  ];

  it("takes only the part of a line the eraser passes over, and leaves the ends", () => {
    const left = rubOut([across, elsewhere], [50, 52]);

    expect(left).toHaveLength(3);
    expect(left[0]?.at(-1)?.[0]).toBeLessThan(42);
    expect(left[1]?.[0]?.[0]).toBeGreaterThan(58);
    expect(left[2]?.at(-1)).toEqual([100, 10]);
  });

  it("takes a short line it covers whole", () => {
    expect(
      rubOut(
        [
          [
            [48, 50],
            [52, 50],
          ],
        ],
        [50, 50],
      ),
    ).toEqual([]);
  });
});

describe("placeInRoom", () => {
  const note = { left: 900, top: 500, width: 220, height: 200 };

  it("moves a note inside a window made smaller, and keeps it where it was in a large one", () => {
    const small = placeInRoom(note, { width: 800, height: 600 });
    const large = placeInRoom(note, { width: 1600, height: 1000 });

    expect(small).toEqual({ left: 580, top: 400, width: 220, height: 200 });
    expect(large).toEqual(note);
  });

  it("makes a note no larger than the window", () => {
    const placed = placeInRoom({ ...note, width: 900 }, { width: 600, height: 400 });

    expect(placed).toMatchObject({ left: 0, width: 600, height: 200 });
  });
});
