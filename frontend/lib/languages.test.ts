import { describe, it, expect } from "vitest";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, bcp47ForLanguageName } from "./languages";

describe("SUPPORTED_LANGUAGES", () => {
  it("includes English and major Indian coastal-state languages with distinct BCP-47 codes", () => {
    const names = SUPPORTED_LANGUAGES.map((l) => l.name);
    expect(names).toContain("English");
    expect(names).toContain("Hindi");
    expect(names).toContain("Tamil");
    expect(names).toContain("Malayalam");

    const codes = SUPPORTED_LANGUAGES.map((l) => l.bcp47);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("defaults to English", () => {
    expect(DEFAULT_LANGUAGE.name).toBe("English");
  });
});

describe("bcp47ForLanguageName", () => {
  it("maps a known language name to its BCP-47 code, case-insensitively", () => {
    expect(bcp47ForLanguageName("Hindi")).toBe("hi-IN");
    expect(bcp47ForLanguageName("hindi")).toBe("hi-IN");
  });

  it("falls back to the default language for null, empty, or unrecognized input", () => {
    expect(bcp47ForLanguageName(null)).toBe(DEFAULT_LANGUAGE.bcp47);
    expect(bcp47ForLanguageName("")).toBe(DEFAULT_LANGUAGE.bcp47);
    expect(bcp47ForLanguageName("Klingon")).toBe(DEFAULT_LANGUAGE.bcp47);
  });
});
