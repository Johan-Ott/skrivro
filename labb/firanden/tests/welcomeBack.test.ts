import { describe, expect, it } from "vitest";
import { welcomeBack } from "../src/project/welcomeBack";

describe("welcomeBack", () => {
  it("welcomes the writer back after three days away, with the chapter they stopped in", () => {
    expect(welcomeBack("2026-10-01", "2026-10-04", "8. Brevet")?.text).toBe(
      "Boken väntade. Du slutade i 8. Brevet.",
    );
    expect(welcomeBack("2026-10-01", "2026-10-03", "8. Brevet")).toBeNull();
  });
});
