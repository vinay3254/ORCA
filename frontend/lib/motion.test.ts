import { describe, it, expect } from "vitest";
import { springs } from "./motion";

describe("springs.default", () => {
  it("is critically damped with no overshoot", () => {
    expect(springs.default).toEqual({ type: "spring", bounce: 0, duration: 0.35 });
  });
});

describe("springs.momentum", () => {
  it("carries a slight bounce for gesture-driven motion", () => {
    expect(springs.momentum).toEqual({ type: "spring", bounce: 0.2, duration: 0.4 });
  });
});

describe("springs.sheet", () => {
  it("uses drawer/sheet-style bounce", () => {
    expect(springs.sheet).toEqual({ type: "spring", bounce: 0.15, duration: 0.3 });
  });
});
