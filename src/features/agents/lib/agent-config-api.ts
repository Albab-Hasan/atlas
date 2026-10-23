// The per-agent settings Settings → Agents edits, written through one command
// (`agents_configure`, src-tauri/src/commands/agent_config.rs). For an external
// agent they land in its installed-agents map entry; for the native agent, in
// Atlas's own config. The answer is the agent's catalog entry as it now
// stands, and the backend also broadcasts `atlas:agent-catalog:changed`.

import { invoke } from "@tauri-apps/api/core";
import type { AgentCatalogEntry, AgentLaunch } from "@/types/agent-catalog";

/** Only what changes; a field left out is kept. */
export interface AgentConfigPatch {
  enabled?: boolean;
  /** `null` or blank goes back to the agent's own name. */
  displayName?: string | null;
  hiddenModels?: string[];
  /** `command` only for an agent with a command of its own (added by hand or
   *  from the PATH); a registry install's comes from the registry. */
  launch?: Partial<AgentLaunch>;
}

export const agentConfig = {
  configure: (agentId: string, patch: AgentConfigPatch) =>
    invoke<AgentCatalogEntry>("agents_configure", { agentId, patch }),
};
