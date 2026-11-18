import { describe, expect, it } from "vitest";
import {
  addDays,
  formatTime,
  getWeekStart,
  getWeekUtcRange,
  toIsoFromLocalInput,
  toZonedDateKey,
  zonedTimeToUtc,
} from "@/lib/date";

/**
 * The schedule is expressed in Asia/Ho_Chi_Minh (UTC+7, no DST). These tests
 * guard the two boundaries that are easy to get wrong: the local day boundary
 * and the Monday-based week window.
 */
describe("timezone helpers", () => {
  it("converts a local wall-clock time to the correct UTC instant", () => {
    // 20:00 on 2026-01-05 in Vietnam is 13:00 UTC the same day.
    const iso = zonedTimeToUtc("2026-01-05", "20:00").toISOString();
    expect(iso).toBe("2026-01-05T13:00:00.000Z");
  });

  it("handles local midnight as the previous UTC day", () => {
    const iso = zonedTimeToUtc("2026-01-05", "00:00").toISOString();
    expect(iso).toBe("2026-01-04T17:00:00.000Z");
  });

  it("maps an instant to the Vietnam-local calendar day", () => {
    // 17:30 UTC on the 4th is already 00:30 on the 5th in Vietnam.
    expect(toZonedDateKey(new Date("2026-01-04T17:30:00Z"))).toBe("2026-01-05");
    // 16:30 UTC on the 4th is still 23:30 on the 4th in Vietnam.
    expect(toZonedDateKey(new Date("2026-01-04T16:30:00Z"))).toBe("2026-01-04");
  });

  it("formats the time in the site timezone", () => {
    expect(formatTime("2026-01-04T17:30:00Z")).toBe("00:30");
    expect(formatTime("2026-01-04T13:00:00Z")).toBe("20:00");
  });

  it("round-trips a local date and time through an ISO instant", () => {
    const iso = toIsoFromLocalInput("2026-01-05", "20:30");
    expect(iso).toBe("2026-01-05T13:30:00.000Z");
  });
});

describe("week boundaries", () => {
  it("returns the Monday of the week containing a date", () => {
    // 2026-01-07 is a Wednesday.
    expect(getWeekStart("2026-01-07")).toBe("2026-01-05");
    // A Monday maps to itself.
    expect(getWeekStart("2026-01-05")).toBe("2026-01-05");
    // A Sunday maps back to the previous Monday.
    expect(getWeekStart("2026-01-11")).toBe("2026-01-05");
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("anchors the week window on Vietnam-local midnight, not UTC midnight", () => {
    const { startIso, endIso } = getWeekUtcRange("2026-01-05");
    // Monday 00:00 in Vietnam = Sunday 17:00 UTC.
    expect(startIso).toBe("2026-01-04T17:00:00.000Z");
    // The window spans exactly seven local days.
    expect(endIso).toBe("2026-01-11T17:00:00.000Z");
  });

  it("includes an event scheduled at 00:30 local on the Monday", () => {
    const { startIso, endIso } = getWeekUtcRange("2026-01-05");
    const event = toIsoFromLocalInput("2026-01-05", "00:30");
    const t = new Date(event).getTime();
    expect(t).toBeGreaterThanOrEqual(new Date(startIso).getTime());
    expect(t).toBeLessThan(new Date(endIso).getTime());
  });

  it("excludes an event scheduled at 00:30 local on the following Monday", () => {
    const { endIso } = getWeekUtcRange("2026-01-05");
    const event = toIsoFromLocalInput("2026-01-12", "00:30");
    const t = new Date(event).getTime();
    expect(t).toBeGreaterThanOrEqual(new Date(endIso).getTime());
  });
});
