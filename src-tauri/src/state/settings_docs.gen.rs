// Generated from src-tauri/settings-registry.toml — do not edit. Run `bun run settings:gen` after editing that file.
//
// camelCase key → the comment written directly above it in a generated
// `config.toml`, in `AppSettings` field order. `include!`d by
// `state/atlas_config.rs`; see `SETTINGS_DOCS` there.

const SETTINGS_DOCS: &[(&str, &str)] = &[
    (
        "autoAddAtlasGitignore",
        "# Keep Atlas's directory in each opened git project out of version control:\n# `.atlas/` goes into the project's .gitignore (created if needed); a dev\n# build's `.atlas-dev/` goes into .git/info/exclude. No-op on non-git\n# projects. (default: true)",
    ),
    (
        "enableAtlasLogs",
        "# Record Atlas-internal events (sign-in, agent lifecycle, file and browser\n# opens) into the Logs panel. (default: true)",
    ),
    (
        "showHiddenFiles",
        "# Show dotfiles and dot-directories in the explorer file tree. (default: true)",
    ),
    (
        "uiScale",
        "# Interface zoom, where 1.0 is 100%. Also driven by Cmd +/-/0. Must be a\n# number between 0.5 and 2.0. (default: 1.0)",
    ),
    (
        "shareTelemetry",
        "# Anonymous product telemetry. Opt-OUT: on by default, coarse metadata only,\n# never file contents or prompts. See TELEMETRY.md. (default: true)",
    ),
    (
        "linkTelemetryToAccount",
        "# Attribute telemetry to your signed-in Atlas account instead of the anonymous\n# per-device id. Irrelevant while signed out, or while shareTelemetry is false\n# — both gate it. (default: true)",
    ),
    (
        "embeddingModelId",
        "# On-device embedding model, named by its directory. Normally managed for you\n# by the Local Model Manager. Must not be empty. (default: \"all-MiniLM-L6-v2\")",
    ),
    (
        "theme",
        "# Theme id for the whole app: chrome, editor, terminal, diffs and syntax.\n# Unknown ids fall back to \"atlas\" with a warning. (default: \"atlas\")",
    ),
    (
        "themeMode",
        "# Variant selection: exactly \"system\", \"dark\" or \"light\". A missing requested\n# variant falls back to the theme's other one. (default: \"system\")",
    ),
    (
        "themeOverrides",
        "# Optional user-local patch with base, palette and keys tables, applied after\n# the active theme variant. Omitted when empty.",
    ),
    (
        "iconTheme",
        "# File and folder icons, on their own track from the color theme. \"minimal\"\n# keeps Atlas's own lucide icons; anything else names a VS Code icon theme,\n# bundled or installed from Open VSX. (default: \"material-icon-theme\")",
    ),
    (
        "appIcon",
        "# macOS app icon, by id: \"dark\" (the icon Atlas ships with) or \"light\". Any\n# other than dark replaces the Dock and Finder icon. An id this Atlas does not\n# know shows the default. (default: \"dark\")",
    ),
    (
        "adaptiveSuggestions",
        "# Next-step suggestion chips in the agent chat's per-turn card. Exactly\n# \"agent\" or \"off\", nothing else. (default: \"agent\")",
    ),
    (
        "agentSwitchBehavior",
        "# What picking another agent does to a chat that has a conversation: \"new-tab\"\n# keeps it and opens the new agent in a new tab, \"handoff\" switches in place\n# and attaches it to the next message, \"reset\" switches in place and starts\n# over. (default: \"reset\")",
    ),
    (
        "rememberBeforeSwitch",
        "# Before switching agents on a chat with a conversation, send the agent being\n# left /remember (when it offers that command) and wait for it to save what it\n# learned to shared memory. Costs one turn per switch. (default: false)",
    ),
    (
        "gitBlameInline",
        "# Inline git blame — a dim author/age/summary annotation trailing the active\n# line in the editor. (default: true)",
    ),
    (
        "gitAutoFetch",
        "# Quietly `git fetch` the open project when it opens, when Atlas regains\n# focus, and every few minutes, so the Pull badge shows what the remote has.\n# Never pulls or touches your files. (default: true)",
    ),
    (
        "keepAwakeWhileRunning",
        "# Keep the computer awake while an Atlas agent is actively running. Prevents\n# idle system sleep; display can still turn off. No effect on Windows.\n# (default: false)",
    ),
    (
        "autoUpdate",
        "# Check for a newer signed Atlas release on startup and prompt when one is\n# available. (default: true)",
    ),
    (
        "curatedPluginSync",
        "# Let Atlas Agent download the latest curated plugin catalog when it starts —\n# a network request at every launch. Applies the next time the agent starts.\n# (default: false)",
    ),
    (
        "instructionSync",
        "# Mirror CLAUDE.md and .claude/rules/ into a marked block of the active\n# project's AGENTS.md, kept current as they change, for any agent that reads\n# AGENTS.md. Writes into the repository; text outside the block is never\n# changed. Off: the block is taken back out. (default: false)",
    ),
    (
        "updaterIgnoredVersion",
        "# updaterIgnoredVersion: A release you chose to skip in the update prompt.\n# Absent unless one was ignored — TOML has no null, so \"unset\" means the key\n# simply isn't here. Delete the line to clear it; never write an empty string.",
    ),
    (
        "enterToSend",
        "# Chat composer send gesture. true = Enter sends and Shift+Enter inserts a\n# newline; false = only Cmd/Ctrl+Enter sends. Cmd/Ctrl+Enter sends either way.\n# (default: true)",
    ),
    (
        "agentUiNavigation",
        "# Let Atlas Agent act on the window: open files at a line, switch tabs and\n# panels, fill in a chat message, type a command for you to run. It never\n# switches projects, sends for you or presses Enter. Off: its UI tools are\n# withdrawn and every call is refused. (default: true)",
    ),
    (
        "agentOrgAccess",
        "# Let Atlas Agent act in your organization, as you: read the recorded\n# sessions, comments, members and conversations of the organization a\n# cloud-bound Project belongs to. Anything that reaches another person asks\n# you first. Off: its organization tools are withdrawn and every call is\n# refused. (default: true)",
    ),
    (
        "agentCodeTools",
        "# Let agents search this project's code through Atlas: grep for text and find\n# files by name, in-process, respecting .gitignore and never reading secret\n# files such as .env. Off: the code tools are withdrawn and every call is\n# refused; agents use their own shell instead. (default: true)",
    ),
    (
        "memoryDreams",
        "# Once a day, when there are new sessions, ask the memory model to propose\n# changes to shared memory (add, merge, archive, rewrite, link). Proposals\n# wait in Memory > Review; nothing is applied without you. Uses the same model\n# and consent as extraction. (default: false)",
    ),
    (
        "memoryRepoMirror",
        "# Keep a read-only Agent Memory Repo mirror of each project's active memory,\n# as a local git repository outside the project. No remote, nothing is pushed.\n# (default: false)",
    ),
    (
        "atlasOnlyMemory",
        "# Atlas's shared memory is the only memory in Atlas sessions: agents that keep\n# their own memory, such as Claude Code's auto memory, start with it turned\n# off. Off: each agent also keeps its own memory files. (default: true)",
    ),
    (
        "terminalNotifications",
        "# Legacy: superseded by notifyDisabledKinds. Read once by the notification\n# migration and ignored after; safe to delete once notificationsMigrated is\n# true. (default: true)",
    ),
    (
        "terminalNotifyMinDurationMs",
        "# A successful command shorter than this many milliseconds never notifies.\n# Must be between 0 and 3600000. (default: 10000)",
    ),
    (
        "terminalNotifyOnFailure",
        "# Legacy: superseded by notifyDisabledKinds. Read once by the notification\n# migration and ignored after; safe to delete once notificationsMigrated is\n# true. (default: true)",
    ),
    (
        "terminalNotifyOnAttention",
        "# Legacy: superseded by notifyDisabledKinds. Read once by the notification\n# migration and ignored after; safe to delete once notificationsMigrated is\n# true. (default: true)",
    ),
    (
        "terminalNotifyNative",
        "# Legacy: superseded by the notify*Native keys. Read once by the notification\n# migration and ignored after; safe to delete once notificationsMigrated is\n# true. (default: true)",
    ),
    (
        "terminalNotifySound",
        "# Legacy: superseded by the notify*Sound keys. Read once by the notification\n# migration and ignored after; safe to delete once notificationsMigrated is\n# true. (default: false)",
    ),
    (
        "notificationsEnabled",
        "# Notifications master switch. Off silences every notification except sign-in\n# problems, which always show. (default: true)",
    ),
    (
        "notifyNeedsYouNative",
        "# OS banner for notifications that need you — a permission request, a\n# question, a terminal asking for input. Shown only when you are away.\n# (default: true)",
    ),
    (
        "notifyNeedsYouSound",
        "# Sound for notifications that need you. (default: true)",
    ),
    (
        "notifyOutcomeNative",
        "# OS banner when an agent turn or terminal command finishes or fails. Shown\n# only when you are away. (default: true)",
    ),
    (
        "notifyOutcomeSound",
        "# Sound for finished / failed notifications. (default: true)",
    ),
    (
        "notifyWarningNative",
        "# OS banner for warnings — context nearly full, rate limited, retrying, agent\n# stopped. (default: false)",
    ),
    (
        "notifyWarningSound",
        "# Sound for warnings. (default: false)",
    ),
    (
        "notifyTeamNative",
        "# OS banner for Chat direct messages and @mentions. Shown only when you are\n# away. (default: true)",
    ),
    (
        "notifyTeamSound",
        "# Sound for Chat notifications. (default: true)",
    ),
    (
        "notifyPermissionActions",
        "# Show Allow once / Deny buttons on permission banners. Off: the banner only\n# opens the session. (default: true)",
    ),
    (
        "notificationsMigrated",
        "# Set once Atlas has folded your earlier terminal and agent notification\n# choices into the keys above. Leave it alone. (default: false)",
    ),
    (
        "notifyDisabledKinds",
        "# Notification kinds you switched off in Settings > Notifications, by id, e.g.\n# [\"terminal-done\", \"git-behind\"]. Unknown ids are ignored; a kind that must\n# always show (sign-in lost) cannot be silenced. (default: [])",
    ),
    (
        "notifyKindsMigrated",
        "# Set once Atlas has folded your earlier per-kind notification switches into\n# notifyDisabledKinds. Leave it alone. (default: false)",
    ),
    (
        "notifyAgentMinDurationMs",
        "# An agent turn that finished faster than this many milliseconds stays quiet;\n# failures and requests for you are never held back. 0 turns it off. Must be\n# between 0 and 3600000. (default: 0)",
    ),
    (
        "favoriteModels",
        "# Models you starred in the composer's model picker, as \"agentType:modelId\",\n# e.g. [\"claude-code:opus\"]. Starred models open the picker on Favorites.\n# Unknown entries are ignored. (default: [])",
    ),
];
