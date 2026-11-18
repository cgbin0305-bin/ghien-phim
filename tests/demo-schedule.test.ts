import { describe, expect, it } from "vitest";
import { buildDemoSchedule } from "@/lib/data/demo";
import { getWeekStart, toZonedDateKey, getWeekUtcRange } from "@/lib/date";

/**
 * The demo schedule must cover the whole visible week (Monday..Sunday) in
 * Asia/Ho_Chi_Minh, and events in the past must be marked "aired".
 */
describe("demo schedule", () => {
  const now = new Date("2026-11-13T10:00:00Z"); // Friday 17:00 in Vietnam
  const events = buildDemoSchedule(now);

  it("produces events across seven distinct local days", () => {
    const days = new Set(events.map((e) => toZonedDateKey(new Date(e.scheduledAt))));
    expect(days.size).toBe(7);
  });

  it("marks events in the past as aired and future ones as scheduled", () => {
    const aired = events.filter((e) => e.status === "aired");
    const scheduled = events.filter((e) => e.status === "scheduled");
    expect(aired.length).toBeGreaterThan(0);
    expect(scheduled.length).toBeGreaterThan(0);

    for (const event of aired) {
      expect(new Date(event.scheduledAt).getTime()).toBeLessThan(now.getTime());
    }
    for (const event of scheduled) {
      expect(new Date(event.scheduledAt).getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it("falls inside the visible week window", () => {
    const weekStart = getWeekStart("2026-11-13");
    const { startIso, endIso } = getWeekUtcRange(weekStart);
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();

    const inWindow = events.filter((e) => {
      const t = new Date(e.scheduledAt).getTime();
      return t >= start && t < end;
    });

    // All 14 demo events should land inside the current week so the weekly
    // grid is never empty.
    expect(inWindow.length).toBe(events.length);
  });
});
