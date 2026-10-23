import { normalizeName } from "./names.js";

const DAY_MS = 86_400_000;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as yyyy-mm-dd. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from today to iso (negative if in the past). */
export function daysUntil(iso: string, now = new Date()): number {
  return Math.round((Date.parse(iso) - Date.parse(isoDate(now))) / DAY_MS);
}

/**
 * Turns what a person says into a date: "tomorrow", "friday", "in 3 days",
 * "next week", or an ISO date. Returns undefined when it can't be understood.
 */
export function parseExpiry(text: string, now = new Date()): string | undefined {
  const s = text.toLowerCase().trim();
  const today = isoDate(now);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Number.isNaN(Date.parse(s)) ? undefined : s;
  if (s === "today" || s === "tonight") return today;
  if (s === "tomorrow") return addDays(today, 1);
  if (s === "next week") return addDays(today, 7);
  const rel = s.match(/^(?:in\s+)?(\d+)\s+(day|days|week|weeks)$/);
  if (rel) return addDays(today, Number(rel[1]) * (rel[2].startsWith("week") ? 7 : 1));
  const wd = s.match(/^(?:this\s+|next\s+|on\s+)?([a-z]+)$/);
  if (wd) {
    const idx = WEEKDAYS.indexOf(wd[1]);
    if (idx >= 0) {
      const diff = ((idx - now.getDay() + 7) % 7) || 7; // same weekday means a week from now
      return addDays(today, diff + (s.startsWith("next ") ? 7 : 0));
    }
  }
  return undefined;
}

// Rough fridge/pantry shelf life in days, used when no expiry is given.
const SHELF_LIFE: Record<string, number> = {
  milk: 7, egg: 21, bread: 5, spinach: 5, lettuce: 7, tomato: 7, chicken: 2, fish: 2, beef: 4,
  yogurt: 14, cheese: 21, butter: 60, banana: 5, apple: 28, carrot: 21, potato: 30, onion: 30,
  paneer: 7, rice: 365, pasta: 365, flour: 180, lentil: 365, berry: 5, strawberry: 5, peach: 5,
};

export function estimateExpiry(name: string, now = new Date()): string | undefined {
  const days = SHELF_LIFE[normalizeName(name)];
  return days === undefined ? undefined : addDays(isoDate(now), days);
}
