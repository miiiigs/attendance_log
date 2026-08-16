import { describe, expect, it } from "vitest";
import { formatAttendanceTime, getFullName, isLate } from "./attendance";

describe("attendance utils", () => {
  it("formats null attendance time as placeholder", () => {
    expect(formatAttendanceTime(null)).toBe("--");
  });

  it("builds a full name without extra whitespace", () => {
    expect(getFullName("Juan", "Dela Cruz")).toBe("Juan Dela Cruz");
  });

  it("detects late arrival after the grace period", () => {
    expect(isLate("2026-08-16T00:11:00.000Z", "08:00", 10)).toBe(true);
  });
});
