import { afterEach, describe, expect, it } from "vitest";
import { formatDateTime, formatTime, hourCycle, setTimeFormat } from "./format-time";

const AFTERNOON = new Date(2026, 9, 22, 15, 7);

afterEach(() => setTimeFormat("system"));

describe("format-time", () => {
  it("leaves the clock to the locale under system", () => {
    expect(hourCycle()).toEqual({});
    expect(formatTime(AFTERNOON, undefined, "en-US")).toBe("3:07 PM");
  });

  it("forces a 24-hour clock", () => {
    setTimeFormat("24h");
    expect(formatTime(AFTERNOON, undefined, "en-US")).toBe("15:07");
    expect(formatDateTime(AFTERNOON, { hour: "numeric", minute: "2-digit" }, "en-US")).toBe(
      "15:07",
    );
  });

  it("writes midnight as 00, not 24, on a 24-hour clock in a 12-hour locale", () => {
    setTimeFormat("24h");
    expect(formatTime(new Date(2026, 0, 1, 0, 5), undefined, "en-US")).toBe("00:05");
  });

  it("forces a 12-hour clock", () => {
    setTimeFormat("12h");
    expect(formatTime(AFTERNOON, undefined, "en-GB")).toMatch(/^3:07\s?pm$/i);
  });
});
