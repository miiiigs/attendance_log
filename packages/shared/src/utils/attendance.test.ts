import { describe, expect, it } from "vitest";
import { formatAttendanceTime, getDisplayName, getFullName, isLate } from "./attendance";

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

  it("prefers the display name for guests and falls back to the full name", () => {
    expect(getDisplayName(null, null, "Guest Alex")).toBe("Guest Alex");
    expect(getDisplayName("Juan", "Dela Cruz", null)).toBe("Juan Dela Cruz");
    expect(getDisplayName(null, null, null)).toBe("");
  });
});
