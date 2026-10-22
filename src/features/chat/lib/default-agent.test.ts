import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = { defaultAgent: "atlas-agent" };
const catalogById: Record<string, { agentType: string; installed: boolean }> = {};

vi.mock("@/features/app/stores/app-store", () => ({
  useAppStore: { getState: () => ({ currentProject: { path: "/work/app" } }) },
}));
vi.mock("@/features/agents/stores/agent-registry-store", () => ({
  useAgentRegistryStore: { getState: () => ({ catalogById }) },
}));
vi.mock("@/features/settings/lib/use-scoped-setting", () => ({
  projectSettingNow: (_path: string, key: "defaultAgent") => settings[key],
}));

const { defaultAgentForNewSession } = await import("./default-agent");

beforeEach(() => {
  settings.defaultAgent = "atlas-agent";
  for (const key of Object.keys(catalogById)) delete catalogById[key];
});

describe("defaultAgentForNewSession", () => {
  it("is Atlas Agent by default", () => {
    expect(defaultAgentForNewSession()).toBe("atlas-agent");
  });

  it("is the chosen agent once it is installed", () => {
    settings.defaultAgent = "claude-code";
    catalogById["claude-code"] = { agentType: "claude-code", installed: true };
    expect(defaultAgentForNewSession()).toBe("claude-code");
  });

  it("falls back to Atlas Agent for an agent that is not installed, or not known yet", () => {
    settings.defaultAgent = "claude-code";
    expect(defaultAgentForNewSession()).toBe("atlas-agent");
    catalogById["claude-code"] = { agentType: "claude-code", installed: false };
    expect(defaultAgentForNewSession()).toBe("atlas-agent");
  });
});
