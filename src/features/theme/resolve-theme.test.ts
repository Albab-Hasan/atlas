import { describe, expect, it } from "vitest";
import builtinThemes from "@/dev/mock-backend/fixtures/builtin-themes.json";
import { parseColor } from "./color";
import { resolveTheme } from "./resolve-theme";
import { THEME_KEY_REGISTRY } from "./theme-key-registry";
import type { Theme } from "./lib/theme-api";

const themes = builtinThemes as Theme[];

describe("theme resolution", () => {
  it.each(
    themes.flatMap((theme) =>
      (["dark", "light"] as const).map(
        (appearance) => [`${theme.id}/${appearance}`, theme, appearance] as const,
      ),
    ),
  )("resolves every key for %s", (_name, theme, appearance) => {
    const resolved = resolveTheme(theme, appearance);

    expect(Object.keys(resolved.keys)).toHaveLength(THEME_KEY_REGISTRY.length);
    for (const [key, value] of Object.entries(resolved.keys)) {
      expect(parseColor(value), `${theme.id}/${appearance}: ${key} = ${value}`).not.toBeNull();
    }
  });

  it("applies base, palette, and key overrides after the theme", () => {
    const resolved = resolveTheme(themes[0], "dark", {
      base: { foreground: "#123456" },
      palette: { red: "#654321" },
      keys: { "syntax.keyword": "#abcdef" },
    });

    expect(resolved.base.foreground).toBe("#123456");
    expect(resolved.keys["terminal.ansi.red"]).toBe("#654321");
    expect(resolved.keys["syntax.keyword"]).toBe("#abcdef");
  });
});

describe("interface contrast", () => {
  const atlas = themes.find((theme) => theme.id === "atlas")!;
  /** Distance between two colours, summed over channels. */
  const distance = (a: string, b: string) => {
    const [x, y] = [parseColor(a)!, parseColor(b)!];
    return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b);
  };

  it("leaves the theme as written at 100%", () => {
    expect(resolveTheme(atlas, "dark", {}, 100)).toEqual(resolveTheme(atlas, "dark"));
  });

  it("moves borders toward the text above 100% and toward the background below", () => {
    const plain = resolveTheme(atlas, "dark");
    const high = resolveTheme(atlas, "dark", {}, 200);
    const low = resolveTheme(atlas, "dark", {}, 50);
    const { foreground, background } = plain.base;

    expect(distance(high.keys["border.strong"], foreground)).toBeLessThan(
      distance(plain.keys["border.strong"], foreground),
    );
    expect(distance(low.keys["border.strong"], background)).toBeLessThan(
      distance(plain.keys["border.strong"], background),
    );
    // The CSS and the typed record agree, so xterm and the charts see it too.
    expect(high.cssVars["--atlas-border-strong"]).toBe(high.keys["border.strong"]);
    expect(high.cssVars["--border"]).toBe(high.base.border);
  });
});
