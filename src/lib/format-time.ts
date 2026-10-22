/**
 * Times of day in the user's `timeFormat`: a 12- or 24-hour clock, or the
 * system's. Every place Atlas shows a time goes through here, so the setting
 * reaches all of them.
 *
 * The format is held here rather than read from the settings store, so these
 * pure helpers stay importable anywhere (tests included) without pulling in
 * the store and its IPC. The settings store pushes it in with
 * `setTimeFormat` on load and on every change; a view shows it on its next
 * render.
 */

export type TimeFormat = "system" | "12h" | "24h";

let current: TimeFormat = "system";

export function setTimeFormat(format: TimeFormat): void {
  current = format;
}

export function timeFormat(): TimeFormat {
  return current;
}

/** `hourCycle` for the active format; nothing for "system", so the locale
 *  decides. Not `hour12: false`: some engines read that as the `h24` cycle for
 *  a 12-hour locale and print midnight as "24:05". */
export function hourCycle(): { hourCycle?: "h12" | "h23" } {
  if (current === "12h") return { hourCycle: "h12" };
  if (current === "24h") return { hourCycle: "h23" };
  return {};
}

type DateInput = Date | number | string;

const SHORT_TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/** A time of day, e.g. "3:07 PM" or "15:07". `options` picks the fields. */
export function formatTime(
  at: DateInput,
  options: Intl.DateTimeFormatOptions = SHORT_TIME,
  locale?: string | string[],
): string {
  return new Date(at).toLocaleTimeString(locale, { ...options, ...hourCycle() });
}

/** A date with its time, e.g. "Oct 22, 2026, 3:07 PM". */
export function formatDateTime(
  at: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locale?: string | string[],
): string {
  return new Date(at).toLocaleString(locale, { ...options, ...hourCycle() });
}
