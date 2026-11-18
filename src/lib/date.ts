import { SITE_TIMEZONE } from "@/lib/env";

/**
 * All schedule logic is expressed in the Asia/Ho_Chi_Minh timezone.
 *
 * The database stores `timestamptz` (absolute instants). The "week" a user
 * sees is defined by the local calendar in Asia/Ho_Chi_Minh, so the boundaries
 * of a day must be computed in that zone - not in UTC and not in the
 * server's local time.
 */

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(date: Date = new Date()): ZonedParts {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const hour = get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: hour === 24 ? 0 : hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/** `yyyy-mm-dd` for the given instant, in the site timezone. */
export function toZonedDateKey(date: Date = new Date()): string {
  const { year, month, day } = getZonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Converts a `yyyy-mm-dd` local date + `HH:mm` wall time into a UTC instant.
 *
 * Asia/Ho_Chi_Minh is a fixed UTC+7 offset with no daylight saving, so the
 * conversion is exact and safe to perform without a full tz database.
 */
export function zonedTimeToUtc(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0, 0) - 7 * 60 * 60 * 1000;
  return new Date(utcMillis);
}

/** Parses `yyyy-mm-dd` into a Date at UTC midnight (used for plain date math). */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

/**
 * Returns the Monday of the week containing `dateKey` (Mon..Sun).
 */
export function getWeekStart(dateKey: string): string {
  const date = parseDateKey(dateKey);
  // getUTCDay(): 0 = Sunday. Shift so Monday = 0.
  const dayIndex = (date.getUTCDay() + 6) % 7;
  return addDays(dateKey, -dayIndex);
}

/**
 * UTC instant range `[start, end)` covering the seven Vietnam-local calendar
 * days of the week starting at `weekStart` (a Monday `yyyy-mm-dd` key).
 *
 * The range must be anchored on the LOCAL midnight in Asia/Ho_Chi_Minh, not on
 * UTC midnight: anchoring on UTC would shift the window by 7 hours and drop
 * events scheduled between 00:00 and 07:00 local time on the Monday while
 * pulling in Sunday-night events from the following week.
 */
export function getWeekUtcRange(weekStart: string): { startIso: string; endIso: string } {
  const start = zonedTimeToUtc(weekStart, "00:00");
  const end = zonedTimeToUtc(addDays(weekStart, 7), "00:00");
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function getTodayKey(): string {
  return toZonedDateKey();
}

export function getWeekBounds(weekStart: string): { weekStart: string; weekEnd: string } {
  return { weekStart, weekEnd: addDays(weekStart, 6) };
}

const WEEKDAY_LABELS = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];
const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function getWeekdayLabel(dateKey: string, short = false): string {
  const date = parseDateKey(dateKey);
  const index = (date.getUTCDay() + 6) % 7;
  return short ? WEEKDAY_SHORT[index]! : WEEKDAY_LABELS[index]!;
}

export function getDayOfMonth(dateKey: string): number {
  return parseDateKey(dateKey).getUTCDate();
}

export function getMonthLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** `HH:mm` in the site timezone. */
export function formatTime(iso: string): string {
  const { hour, minute } = getZonedParts(new Date(iso));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** `dd/MM/yyyy` in the site timezone. */
export function formatDate(iso: string): string {
  const { year, month, day } = getZonedParts(new Date(iso));
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** `dd/MM/yyyy HH:mm` in the site timezone. */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** Human relative label for a scheduled instant. */
export function formatRelative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  if (minutes < 0) return "đã lên sóng";
  if (minutes < 60) return `còn ${minutes} phút`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `còn ${hours} giờ`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ngày mai";
  if (days < 7) return `còn ${days} ngày`;
  return formatDate(iso);
}

/** `yyyy-mm-dd` + `HH:mm` -> ISO instant, interpreting input as site-local time. */
export function toIsoFromLocalInput(dateKey: string, time: string): string {
  return zonedTimeToUtc(dateKey, time).toISOString();
}
