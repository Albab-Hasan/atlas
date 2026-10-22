import { create } from "zustand";

/**
 * Every section the Settings panel can show.
 *
 * Named rather than left as `string` because the callers that navigate here
 * (the sidebar's Skills button, the account menu) live nowhere near the panel:
 * a typo would compile, open Settings, and silently land on nothing. The
 * sidebar in `settings-panel.tsx` is typed against this, and every page of the
 * settings registry (`SETTINGS_PAGES`) must be one of these — a type check in
 * `settings-sections.ts` fails the build otherwise. The agent-facing `ui_open`
 * tool offers the same list (`ui-actions-contract.test.ts`).
 */
export const SETTINGS_SECTIONS = [
  "general",
  "appearance",
  "icons",
  "chat",
  "memory",
  "notifications",
  "source-control",
  "privacy",
  "keybindings",
  "updates",
  "agents",
  "skills",
  "providers",
  "models",
  "layouts",
  "about",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** Cross-component signal to open the Settings tab on a specific section.
 *  Set `goTo(section)` before/after opening the (singleton, persistent) settings
 *  tab; `SettingsPanel` consumes it so the switch works whether the tab is
 *  freshly opened or already mounted on another section. */
interface SettingsNavState {
  section: SettingsSection | null;
  /** A row to scroll to and flash once its section renders (a setting key, or
   *  a row's own anchor). Consumed by the row that owns it. */
  anchor: string | null;
  /** The section the mounted panel is showing right now (null: no panel) —
   *  what lets a notification know the user is already looking at its subject. */
  shown: string | null;
  /** Which settings the pages edit: `null` for every project (the global
   *  `config.toml`), or one project's path (its `.atlas/config.toml`). */
  scope: string | null;
  setScope: (scope: string | null) => void;
  goTo: (section: SettingsSection, anchor?: string) => void;
  clear: () => void;
  clearAnchor: () => void;
  setShown: (section: string | null) => void;
}

export const useSettingsNav = create<SettingsNavState>((set) => ({
  section: null,
  anchor: null,
  shown: null,
  scope: null,
  setScope: (scope) => set({ scope }),
  goTo: (section, anchor) => set({ section, anchor: anchor ?? null }),
  clear: () => set({ section: null }),
  clearAnchor: () => set({ anchor: null }),
  setShown: (shown) => set({ shown }),
}));
