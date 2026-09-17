import { describe, it, expect } from "vitest";
import { STATUS_THEMES } from "./theme";

describe("STATUS_THEMES", () => {
  it("defines a theme for every DataStatus value", () => {
    expect(Object.keys(STATUS_THEMES).sort()).toEqual(
      ["CACHED", "FORECAST", "HISTORICAL", "LIVE"].sort()
    );
  });

  it("gives LIVE the highest-contrast monochrome treatment", () => {
    expect(STATUS_THEMES.LIVE.label).toBe("LIVE");
    expect(STATUS_THEMES.LIVE.bg).toContain("primary");
  });
});
