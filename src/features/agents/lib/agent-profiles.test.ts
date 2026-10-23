import { describe, expect, it } from "vitest";
import type { AgentVariable } from "@/types/agent-catalog";
import {
  claimedVariables,
  numberProblem,
  profileFor,
  readField,
  writeField,
  type ProfileField,
} from "./agent-profiles";

const field = (label: string, agent = "claude-acp"): ProfileField => {
  const f = profileFor(agent)?.fields.find((x) => x.label === label);
  if (!f) throw new Error(`no ${label} on ${agent}`);
  return f;
};

describe("agent profiles", () => {
  it("an agent with no profile has no fields and claims no variables", () => {
    expect(profileFor("some-agent")).toBeUndefined();
    expect(claimedVariables(undefined).size).toBe(0);
  });

  it("every field names a variable a process can carry", () => {
    for (const id of [
      "claude-acp",
      "codex-acp",
      "gemini",
      "github-copilot-cli",
      "opencode",
      "cursor",
    ]) {
      for (const name of claimedVariables(profileFor(id))) {
        expect(name).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
      }
    }
  });

  it("an env field reads and writes its variable, and clearing removes it", () => {
    const dir = field("CLAUDE_CONFIG_DIR path");
    let vars: AgentVariable[] = [{ name: "OTHER", value: "1", sensitive: false }];
    expect(readField(vars, dir)).toBe("");
    vars = writeField(vars, dir, " ~/.claude-work ");
    expect(readField(vars, dir)).toBe("~/.claude-work");
    expect(vars.find((v) => v.name === "OTHER")?.value).toBe("1");
    expect(writeField(vars, dir, "").map((v) => v.name)).toEqual(["OTHER"]);
  });

  it("a secret goes in sensitive and reads back as stored-but-hidden", () => {
    const key = field("API key");
    const vars = writeField([], key, "sk-1");
    expect(vars).toEqual([{ name: "ANTHROPIC_API_KEY", value: "sk-1", sensitive: true }]);
    expect(
      readField([{ name: "ANTHROPIC_API_KEY", value: null, sensitive: true }], key),
    ).toBeNull();
  });

  it("Codex fields share one CODEX_CONFIG object and keep each other's keys", () => {
    const effort = field("Reasoning effort", "codex-acp");
    const compact = field("Auto-compact after", "codex-acp");
    let vars = writeField([], effort, "high");
    vars = writeField(vars, compact, "200000");
    expect(JSON.parse(vars[0]!.value!)).toEqual({
      model_reasoning_effort: "high",
      model_auto_compact_token_limit: 200000,
    });
    expect(readField(vars, compact)).toBe("200000");
    vars = writeField(vars, effort, "");
    vars = writeField(vars, compact, "");
    expect(vars).toEqual([]);
  });

  it("number fields check their range", () => {
    const window = field("Auto-compact after");
    expect(numberProblem(window, "")).toBeNull();
    expect(numberProblem(window, "300000")).toBeNull();
    expect(numberProblem(window, "50")).toMatch(/At least/);
    expect(numberProblem(window, "2000000")).toMatch(/At most/);
    expect(numberProblem(window, "1.5")).toMatch(/whole/);
  });
});
