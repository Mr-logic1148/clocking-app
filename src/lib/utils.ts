import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ORG_TIMEZONE = process.env.ORG_TIMEZONE ?? "Europe/London";
export const OVERTIME_DAILY_HOURS = Number(process.env.OVERTIME_DAILY_HOURS ?? 8);
export const OVERTIME_WEEKLY_HOURS = Number(process.env.OVERTIME_WEEKLY_HOURS ?? 40);
export const KIOSK_IDLE_MS = 5_000;

export function minutesToHoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
