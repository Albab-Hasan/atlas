import { describe, expect, it } from "vitest";
import { colorToCss, parseColor } from "./color";

const css = (value: string) => colorToCss(parseColor(value)!);

describe("hsl()", () => {
  it("keeps every channel for a hue past 240°, and wraps a hue outside 0–360", () => {
    expect(css("hsl(0 100% 50%)")).toBe("#ff0000");
    expect(css("hsl(300 100% 50%)")).toBe("#ff00ff");
    expect(css("hsl(-60 100% 50%)")).toBe("#ff00ff");
    expect(css("hsl(660 100% 50%)")).toBe("#ff00ff");
  });
});
