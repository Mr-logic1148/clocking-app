import { startOfLocalDay } from "@/lib/time-engine";

export const STATIONS = [
  "Packing Line 1",
  "Packing Line 2",
  "Cold Store",
  "Harvesting",
  "Dispatch",
  "QC",
] as const;

export const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export function shiftsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

/** Inclusive local-day walk between two YYYY-MM-DD (or datetime) strings. */
export function eachLocalDate(from: Date, to: Date) {
  const days: Date[] = [];
  let cursor = startOfLocalDay(from);
  const last = startOfLocalDay(to);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
}

export function combineLocalDateAndTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const copy = new Date(day);
  copy.setHours(h || 0, m || 0, 0, 0);
  return copy;
}

export function jsWeekday(date: Date) {
  return date.getDay();
}
