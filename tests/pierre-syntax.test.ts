import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The Atlas theme's syntax colours are Pierre's (`@pierre/theme`), written
 * into `atlas.toml` by `bun run theme:pierre` through Atlas's own VS Code
 * importer. The dependency is the source; the TOML is derived and committed,
 * because Rust compiles the built-in themes in and cannot read
 * `node_modules`.
 *
 * What fails silently without this: bumping `@pierre/theme` and forgetting
 * the script. Nothing errors — the app keeps the old colours and the lockfile
 * claims the new ones. So the version each generated block names must be the
 * version installed, and Pierre's licence and notice must sit beside it.
 */

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const toml = readFileSync(path.join(root, "crates/atlas-theme/themes/atlas.toml"), "utf8");
const installed = JSON.parse(
  readFileSync(path.join(root, "node_modules/@pierre/theme/package.json"), "utf8"),
).version as string;

describe("Atlas theme syntax colours come from @pierre/theme", () => {
  for (const variant of ["dark", "light"]) {
    it(`the ${variant} block names the installed version`, () => {
      const match = toml.match(
        new RegExp(`# BEGIN syntax from @pierre/theme (\\S+) \\(pierre-${variant}\\)`),
      );
      expect(match, `atlas.toml has no generated ${variant} block`).not.toBeNull();
      expect(match?.[1], "run `bun run theme:pierre` after updating @pierre/theme").toBe(installed);
    });
  }

  it("carries Pierre's licence and notice", () => {
    for (const file of ["LICENSE", "NOTICE.md"]) {
      expect(existsSync(path.join(root, "crates/atlas-theme/third-party/pierre-theme", file))).toBe(
        true,
      );
    }
  });
});
