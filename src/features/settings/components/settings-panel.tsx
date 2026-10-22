import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { ScrollArea } from "@/ui/scroll-area";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { ProvidersSettings } from "./providers-settings";
import { LayoutsSettings } from "./layouts-settings";
import { SkillsAndPacks } from "./skills-and-packs";
import { AgentsMarketplace } from "./agents-marketplace/agents-marketplace";
import { ModelsManager } from "./models-manager";
import { KeybindingsSettings } from "./keybindings-settings";
import { NotificationsSettings } from "./notifications-settings";
import { GeneralPage } from "./pages/general-page";
import { AppearancePage } from "./pages/appearance-page";
import { ChatPage } from "./pages/chat-page";
import { MemoryPage } from "./pages/memory-page";
import { AboutPage, PrivacyPage, SourceControlPage, UpdatesPage } from "./pages/other-pages";
import { SettingsSidebar } from "./settings-sidebar";
import {
  SETTINGS_SECTIONS,
  useSettingsNav,
  type SettingsSection,
} from "../stores/settings-nav-store";
import { useSettingsStore } from "../stores/settings-store";
import { DEFAULT_SETTINGS, type AppSettings } from "../lib/app-settings";
import { changedOnPage, sectionLabel, type SearchItem } from "../lib/settings-sections";
import { useAgentRegistryStore } from "@/features/agents/stores/agent-registry-store";
import { Toggle } from "./settings-controls";

export { Toggle };

const NAV_COLLAPSED_KEY = "atlas:settings:navCollapsed";

/** Screens that own their whole layout, toolbar and scrolling included. */
const SCREENS: Partial<Record<SettingsSection, () => React.ReactElement>> = {
  keybindings: () => <KeybindingsSettings />,
  agents: () => <AgentsMarketplace />,
  skills: () => <SkillsAndPacks />,
  providers: () => <ProvidersSettings />,
  models: () => <ModelsManager />,
};

/** Pages drawn with the settings layout, inside one scroll area. */
const PAGES: Partial<Record<SettingsSection, () => React.ReactElement>> = {
  general: () => <GeneralPage />,
  appearance: () => <AppearancePage />,
  chat: () => <ChatPage />,
  memory: () => <MemoryPage />,
  notifications: () => <NotificationsSettings />,
  "source-control": () => <SourceControlPage />,
  privacy: () => <PrivacyPage />,
  updates: () => <UpdatesPage />,
  layouts: () => <LayoutsSettings />,
  about: () => <AboutPage />,
};

const asSection = (value: string | undefined): SettingsSection =>
  (SETTINGS_SECTIONS as readonly string[]).includes(value ?? "")
    ? (value as SettingsSection)
    : "general";

export function SettingsPanel({ initialSection }: { initialSection?: string } = {}) {
  const [active, setActive] = useState<SettingsSection>(() => asSection(initialSection));

  // Honor cross-component "open Settings → <section>" requests (e.g. the
  // sidebar's Skills button), whether this panel is fresh or already mounted.
  const navSection = useSettingsNav((s) => s.section);
  const clearNav = useSettingsNav((s) => s.clear);
  const setShown = useSettingsNav((s) => s.setShown);
  const goTo = useSettingsNav((s) => s.goTo);
  useEffect(() => {
    setShown(active);
    return () => setShown(null);
  }, [active, setShown]);
  useEffect(() => {
    if (navSection) {
      setActive(navSection);
      clearNav();
    }
  }, [navSection, clearNav]);

  // Installed agents whose copy on disk is behind the registry. Background
  // prefetch clears most of these on its own; what is left (offline, npm
  // failing) is what needs the user's hand, so the nav says so.
  const agentUpdates = useAgentRegistryStore(
    (s) => s.registryEntries.filter((e) => e.installed && e.updateAvailable).length,
  );

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = useCallback(
    () =>
      setCollapsed((c) => {
        const next = !c;
        try {
          localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        return next;
      }),
    [],
  );

  const onSearchPick = (item: SearchItem) => goTo(item.section, item.anchor);

  const screen = SCREENS[active];
  const page = PAGES[active];

  return (
    <div className="flex h-full">
      <SettingsSidebar
        active={active}
        onSelect={setActive}
        onSearchPick={onSearchPick}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        badges={{ agents: agentUpdates }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
          <p className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Settings</span>
            <span className="text-disabled">/</span>
            <span className="font-medium text-foreground">{sectionLabel(active)}</span>
          </p>
          <RestoreDefaults section={active} />
        </header>
        {screen ? (
          <div className="min-h-0 min-w-0 flex-1">{screen()}</div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">{page?.()}</ScrollArea>
        )}
      </div>
    </div>
  );
}

/**
 * Put every setting on this page back to its default, after saying exactly
 * which ones will change. Shown only while at least one differs.
 */
function RestoreDefaults({ section }: { section: SettingsSection }) {
  const settings = useSettingsStore.use.settings();
  const { updateSettings } = useSettingsStore.use.actions();
  const [open, setOpen] = useState(false);
  const changed = changedOnPage(section, settings);
  if (changed.length === 0) return null;
  const restore = () => {
    const patch: Partial<AppSettings> = {};
    for (const meta of changed) {
      (patch as Record<string, unknown>)[meta.key] = DEFAULT_SETTINGS[meta.key];
    }
    void updateSettings(patch);
    setOpen(false);
  };
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon icon={RotateCcw} size="sm" />
        Restore defaults
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore {sectionLabel(section)} defaults?</DialogTitle>
            <DialogDescription>
              {changed.length === 1
                ? "This setting goes back to its default."
                : `These ${changed.length} settings go back to their defaults.`}{" "}
              Nothing on other pages changes.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1 rounded-md border border-border-subtle p-2">
            {changed.map((meta) => (
              <li key={meta.key} className="text-2xs text-secondary-foreground">
                {meta.section} › {meta.title}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <Button onClick={restore}>Restore defaults</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
