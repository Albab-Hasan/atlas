# ADR-0023: The well-known agents get settings profiles, and an agent's secrets live in the keychain

**Status:** Accepted (2026-10-23). Narrows ADR-0002's "no agent gets special treatment" for settings only, and revises `byok.rs`'s "Atlas stores no API keys" for per-agent variables.

**For agents:** profiles are `src/features/agents/lib/agent-profiles.ts`; the keychain is `src-tauri/src/commands/agent_secrets.rs` behind `atlas_agent_store::SecretSource`; the per-agent settings are written by `agents_configure` in `src-tauri/src/commands/agent_config.rs`.

## Context

- Settings → Agents follows T3 Code's provider editor, which gives each provider named fields: Claude's `CLAUDE_CONFIG_DIR path` and `Auto-compact after`, Codex's `CODEX_HOME path`, and so on. Atlas could only offer an agent a command, launch arguments and a list of environment variables, which leaves every user to find the right variable names in each agent's docs.
- The ACP adapters for Claude and Codex ignore extra launch arguments: `claude-agent-acp` reads only `--cli` and `--version`, and `codex-acp` only `--version`, `login` and `cli`. Both pass their whole environment through to the agent, so documented environment variables are the one way to configure them.
- T3 keeps a provider's API key per instance, stored apart from its settings. Atlas kept every key in the user's shell profile (Provider keys), so a key meant for one agent applied to all of them.

## Decision

- **A profile is data, keyed by ACP registry id.** It lists named fields, each a view onto one environment variable or one key inside a JSON variable (Codex's `CODEX_CONFIG`). A profile never changes how Atlas starts or talks to an agent. An agent without a profile is configured through the same Variables list, and the Variables list hides the variables a profile's fields show. Profiles exist for the most-used agents: Claude, Codex, Gemini, GitHub Copilot, opencode and Cursor. Each field comes from that agent's official docs, checked against its adapter's source.
- A profile can also say that launch arguments do nothing for its agent, which hides that field.
- **A variable marked sensitive keeps only its name in the installed map.** Its value goes to the OS keychain: service `Atlas agent variables`, account `<agent id>/<NAME>`. The value is read when the agent starts, off the async runtime, and is never sent to the webview. Removing an agent deletes its entries. New variables start sensitive.
- Provider keys stay in the shell profile. They are shared by every agent and by the user's other tools, which is a different job.

## Considered

- **No profiles, only Variables.** This is ADR-0002 to the letter, but it leaves the work of looking up variables to every user, for the agents almost everyone runs.
- **Hardcoded behaviour per agent** (a different spawn path or wire for Claude). This is what ADR-0002 actually guards against. Profiles stay at the level of settings: removing a profile changes how its fields look, never what the agent does.
- **Sensitive values in the installed map.** The map is a plain JSON file that people edit by hand and sometimes share.

## Consequences

- A profile can go stale when an agent renames a variable. The docs are cited at the top of the profiles file, so that is where to look first.
- On macOS, a debug build signed differently from the one that stored an item may prompt for keychain access.
