import { describe, expect, it } from "vitest";
import { renderCaps } from "./block-terminal";
import type { TerminalBlock } from "../lib/block-parser";

function block(id: number, lines: number, running = false): TerminalBlock {
  return {
    id,
    command: `cmd${id}`,
    cwd: "/tmp",
    output: "",
    lines: Array.from({ length: lines }, (_, i) => ({ id: id * 100_000 + i, segments: [] })),
    droppedLines: 0,
    exitCode: 0,
    running,
    startedAt: 0,
    endedAt: running ? null : 1,
    rev: 0,
  };
}

describe("renderCaps", () => {
  it("spends one budget across finished blocks, newest first", () => {
    const caps = renderCaps([block(1, 3000), block(2, 3000), block(3, 3000)]);
    expect(caps.get(3)).toBe(3000);
    expect(caps.get(2)).toBe(1000);
    expect(caps.get(1)).toBe(0);
  });

  it("never charges the running block, so finished caps hold still while it streams", () => {
    const before = renderCaps([block(1, 2000), block(2, 10, true)]);
    const after = renderCaps([block(1, 2000), block(2, 5000, true)]);
    expect(after.get(1)).toBe(before.get(1));
    expect(after.get(2)).toBe(400);
  });

  it("caps any one block at its own limit even with budget left", () => {
    expect(renderCaps([block(1, 5000)]).get(1)).toBe(3000);
  });

  it("keeps total rendered lines bounded however long the history", () => {
    const blocks = Array.from({ length: 200 }, (_, i) => block(i + 1, 3000));
    const total = [...renderCaps(blocks).values()].reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(4000);
  });
});
