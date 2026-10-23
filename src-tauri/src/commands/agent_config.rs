//! What the user sets per agent in Settings → Agents: whether it is on, the
//! name it goes by, how it launches, its environment, and which of its models
//! the picker hides.
//!
//! An external agent keeps these in its installed-map entry, beside the rest
//! of what the user configured about it, so a hand edit of `installed.json`
//! and the settings page agree. The native agent has no entry there — the map
//! is the list of external agents, and an entry *is* an install — so its two
//! applicable fields live in a small file of their own in Atlas's config
//! directory.
//!
//! One command writes them all, [`agents_configure`], and answers with the
//! agent's catalog entry as it now stands.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use atlas_native_agent::ATLAS_AGENT_ID;

use super::agent_host::AgentHost;
use super::catalog::{self, AgentCatalogEntry};

/// The native agent's share of the per-agent settings. It cannot be turned
/// off and has no command, arguments or environment of its own.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeAgentPrefs {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub hidden_models: Vec<String>,
}

fn native_prefs_path(config_dir: &Path) -> PathBuf {
    config_dir.join("native-agent.json")
}

/// A missing or unreadable file is the defaults: nothing renamed or hidden.
pub fn load_native_prefs(config_dir: &Path) -> NativeAgentPrefs {
    let path = native_prefs_path(config_dir);
    match std::fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_else(|e| {
            tracing::warn!(
                target: "atlas::agents",
                path = %path.display(),
                "native agent settings are unreadable ({e}); using the defaults"
            );
            NativeAgentPrefs::default()
        }),
        Err(_) => NativeAgentPrefs::default(),
    }
}

fn save_native_prefs(config_dir: &Path, prefs: &NativeAgentPrefs) -> std::io::Result<()> {
    std::fs::create_dir_all(config_dir)?;
    let json = serde_json::to_string_pretty(prefs)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    std::fs::write(native_prefs_path(config_dir), json)
}

/// How an external agent launches, as the catalog reports it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentLaunch {
    /// A custom entry's executable. `None` for a registry install, whose
    /// command the registry names.
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

/// One `agents_configure` call: only what changes.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfigPatch {
    pub enabled: Option<bool>,
    /// `Some(None)` (JSON `null`) and a blank name both go back to the
    /// agent's own name.
    #[serde(default, deserialize_with = "explicit_null")]
    pub display_name: Option<Option<String>>,
    pub hidden_models: Option<Vec<String>>,
    pub launch: Option<LaunchPatch>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchPatch {
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

/// Tell "absent" (keep it) from `null` (clear it): serde reads both as `None`
/// for a plain `Option`.
fn explicit_null<'de, D>(deserializer: D) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(Some)
}

/// A name the user typed, or `None` for "use the agent's own".
fn clean_name(name: Option<String>) -> Option<String> {
    name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty())
}

/// A variable name a process environment can carry.
fn valid_env_name(name: &str) -> bool {
    let mut chars = name.chars();
    chars
        .next()
        .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Apply a patch to an installed-map entry. Pure, so the rules are tested
/// without a host.
pub fn apply_to_entry(
    entry: &mut atlas_agent_store::AgentServerSettings,
    patch: AgentConfigPatch,
) -> Result<(), String> {
    let user = entry.user_settings_mut();
    if let Some(enabled) = patch.enabled {
        *user.enabled = enabled;
    }
    if let Some(name) = patch.display_name {
        *user.display_name = clean_name(name);
    }
    if let Some(hidden) = patch.hidden_models {
        *user.hidden_models = hidden;
    }
    if let Some(launch) = patch.launch {
        if let Some(command) = launch.command {
            let command = command.trim();
            let Some(path) = user.command else {
                return Err("a registry agent's command comes from the registry".into());
            };
            if command.is_empty() {
                return Err("the command can't be empty".into());
            }
            *path = PathBuf::from(command);
        }
        if let Some(args) = launch.args {
            *user.args = args;
        }
        if let Some(env) = launch.env {
            if let Some(bad) = env.keys().find(|name| !valid_env_name(name)) {
                return Err(format!("`{bad}` isn't a valid variable name"));
            }
            *user.env = env;
        }
    }
    Ok(())
}

/// Apply a patch to the native agent's settings.
pub fn apply_to_native(
    prefs: &mut NativeAgentPrefs,
    patch: AgentConfigPatch,
) -> Result<(), String> {
    if patch.enabled == Some(false) {
        return Err("Atlas Agent can't be turned off".into());
    }
    if patch.launch.is_some() {
        return Err("Atlas Agent runs inside Atlas; it has no launch settings".into());
    }
    if let Some(name) = patch.display_name {
        prefs.display_name = clean_name(name);
    }
    if let Some(hidden) = patch.hidden_models {
        prefs.hidden_models = hidden;
    }
    Ok(())
}

/// Change what the user set for one agent, and answer with its catalog entry
/// as it now stands. Emits `atlas:agent-catalog:changed`, so every other
/// agent surface (the picker, labels) follows.
#[tauri::command]
pub async fn agents_configure(
    agent_id: String,
    patch: AgentConfigPatch,
    host: State<'_, Arc<AgentHost>>,
    app: AppHandle,
) -> Result<AgentCatalogEntry, String> {
    let host = host.inner().clone();
    if agent_id == ATLAS_AGENT_ID {
        let config_dir = host.config_dir().to_path_buf();
        let mut prefs = load_native_prefs(&config_dir);
        apply_to_native(&mut prefs, patch)?;
        tauri::async_runtime::spawn_blocking(move || save_native_prefs(&config_dir, &prefs))
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| format!("writing Atlas Agent's settings: {e}"))?;
    } else {
        let mut settings = host.store().settings();
        let entry = settings
            .0
            .get_mut(&agent_id)
            .ok_or_else(|| format!("{agent_id} is not installed"))?;
        apply_to_entry(entry, patch)?;
        let data_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::env::temp_dir());
        super::registry::persist(&host, &data_dir, settings).await?;
    }
    catalog::emit_catalog_changed(&app, "settings");
    catalog::entry_for(&host, &agent_id).ok_or_else(|| format!("{agent_id} is not in the catalog"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use atlas_agent_store::AgentServerSettings;

    fn patch(json: serde_json::Value) -> AgentConfigPatch {
        serde_json::from_value(json).expect("a well-formed patch")
    }

    #[test]
    fn a_patch_changes_only_what_it_names() {
        let mut entry = AgentServerSettings::custom("/opt/agent", vec!["--acp".into()]);
        apply_to_entry(&mut entry, patch(serde_json::json!({ "enabled": false }))).unwrap();
        assert!(!entry.enabled());
        assert_eq!(entry.args(), ["--acp"]);

        apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "launch": { "env": { "REGION": "eu" } } })),
        )
        .unwrap();
        assert_eq!(entry.env().get("REGION").map(String::as_str), Some("eu"));
        assert_eq!(entry.args(), ["--acp"], "env alone leaves the arguments");
    }

    /// `null` and a blank name both mean "use the agent's own name"; a field
    /// left out keeps what was there.
    #[test]
    fn a_display_name_clears_on_null_or_blank() {
        let mut entry = AgentServerSettings::registry();
        apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "displayName": " Work " })),
        )
        .unwrap();
        assert_eq!(entry.display_name(), Some("Work"));
        apply_to_entry(&mut entry, patch(serde_json::json!({ "enabled": true }))).unwrap();
        assert_eq!(entry.display_name(), Some("Work"));
        apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "displayName": null })),
        )
        .unwrap();
        assert_eq!(entry.display_name(), None);
        apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "displayName": "  " })),
        )
        .unwrap();
        assert_eq!(entry.display_name(), None);
    }

    #[test]
    fn a_registry_agents_command_is_not_the_users_to_set() {
        let mut entry = AgentServerSettings::registry();
        let err = apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "launch": { "command": "/bin/sh" } })),
        )
        .unwrap_err();
        assert!(err.contains("registry"), "{err}");
    }

    #[test]
    fn a_custom_command_can_be_replaced_but_not_emptied() {
        let mut entry = AgentServerSettings::custom("/opt/agent", vec![]);
        apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "launch": { "command": "/opt/other" } })),
        )
        .unwrap();
        assert_eq!(
            entry.command().map(|c| c.path),
            Some(PathBuf::from("/opt/other"))
        );
        assert!(apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "launch": { "command": " " } })),
        )
        .is_err());
    }

    #[test]
    fn an_invalid_variable_name_is_refused() {
        let mut entry = AgentServerSettings::registry();
        let err = apply_to_entry(
            &mut entry,
            patch(serde_json::json!({ "launch": { "env": { "1BAD": "x" } } })),
        )
        .unwrap_err();
        assert!(err.contains("1BAD"), "{err}");
        assert!(entry.env().is_empty(), "nothing is half-written");
    }

    #[test]
    fn the_native_agent_can_be_renamed_but_not_turned_off() {
        let mut prefs = NativeAgentPrefs::default();
        apply_to_native(
            &mut prefs,
            patch(serde_json::json!({ "displayName": "Atlas", "hiddenModels": ["m"] })),
        )
        .unwrap();
        assert_eq!(prefs.display_name.as_deref(), Some("Atlas"));
        assert_eq!(prefs.hidden_models, ["m"]);
        assert!(
            apply_to_native(&mut prefs, patch(serde_json::json!({ "enabled": false }))).is_err()
        );
        assert!(apply_to_native(
            &mut prefs,
            patch(serde_json::json!({ "launch": { "args": [] } })),
        )
        .is_err());
    }

    #[test]
    fn native_prefs_round_trip_through_disk() {
        let dir = std::env::temp_dir().join(format!("atlas-native-prefs-{}", uuid::Uuid::new_v4()));
        assert_eq!(load_native_prefs(&dir), NativeAgentPrefs::default());
        let prefs = NativeAgentPrefs {
            display_name: Some("Atlas".into()),
            hidden_models: vec!["m".into()],
        };
        save_native_prefs(&dir, &prefs).unwrap();
        assert_eq!(load_native_prefs(&dir), prefs);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
