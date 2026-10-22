import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Switch } from "@/ui/switch";
import { useSettingsStore } from "../../stores/settings-store";
import { useModelPricingStore } from "../../stores/model-pricing-store";
import {
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "../layout/settings-layout";
import { Select } from "@/ui/select";
import { NATIVE_AGENT_ID } from "@/types/agent";
import { useAgentRegistryStore } from "@/features/agents/stores/agent-registry-store";
import { SettingSelect, SettingSwitch } from "../layout/setting-controls";
import { useScopedSetting } from "../../lib/use-scoped-setting";

const CHAT_WIDTHS = [
  { value: "normal", label: "Normal", description: "760 pixels, the easiest line length to read." },
  { value: "wide", label: "Wide", description: "1080 pixels." },
  { value: "full", label: "Full", description: "The whole panel." },
] as const;

const SIDEBAR_SORTS = [
  { value: "recent", label: "Latest activity" },
  { value: "created", label: "Date started" },
] as const;

const SWITCH_OPTIONS = [
  {
    value: "reset",
    label: "Start over",
    description: "Switch in place with a clean chat.",
  },
  {
    value: "new-tab",
    label: "New tab",
    description: "Keep the conversation and open the new agent beside it.",
  },
  {
    value: "handoff",
    label: "Hand off",
    description: "Switch in place and pass the conversation along with your next message.",
  },
] as const;

export function ChatPage() {
  const settings = useSettingsStore.use.settings();
  const { updateSettings } = useSettingsStore.use.actions();

  return (
    <SettingsPage
      scopeable
      title="Chat"
      description="New chats, the composer, layout, switching agents, and what Atlas Agent may do."
    >
      <SettingsSection title="New chats">
        <SettingsGroup>
          <SettingsRow
            setting="defaultAgent"
            description="The agent a new chat starts with. Until it's installed, chats start with Atlas Agent."
            control={<DefaultAgentSelect />}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Layout">
        <SettingsGroup>
          <SettingsRow
            setting="chatWidth"
            control={<SettingSelect setting="chatWidth" options={CHAT_WIDTHS} />}
          />
          <SettingsRow setting="chatCodeWrap" control={<SettingSwitch setting="chatCodeWrap" />} />
          <SettingsRow
            setting="sidebarSort"
            control={<SettingSelect setting="sidebarSort" options={SIDEBAR_SORTS} />}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Composer">
        <SettingsGroup>
          <SettingsRow setting="enterToSend" control={<SettingSwitch setting="enterToSend" />} />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Conversation">
        <SettingsGroup>
          <SettingsRow
            setting="adaptiveSuggestions"
            description="After each turn, the agent suggests two or three follow-ups as chips. They come from its own session, with no extra API key."
            control={
              <Switch
                checked={settings.adaptiveSuggestions !== "off"}
                aria-label="Next-step suggestions"
                onCheckedChange={(on) =>
                  void updateSettings({ adaptiveSuggestions: on ? "agent" : "off" })
                }
              />
            }
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection
        title="Switching agents"
        description="Every conversation stays in your history, whichever you pick."
      >
        <SettingsGroup>
          <SettingsRow
            setting="agentSwitchBehavior"
            control={<SettingSelect setting="agentSwitchBehavior" options={SWITCH_OPTIONS} />}
          />
          <SettingsRow
            setting="rememberBeforeSwitch"
            description="The agent you leave is sent /remember and saves what it learned to shared memory first. Costs one turn; you can switch right away from the notice."
            control={<SettingSwitch setting="rememberBeforeSwitch" />}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection
        title="Atlas Agent permissions"
        description="Every action shows in the chat and in the Logs panel."
      >
        <SettingsGroup>
          <SettingsRow
            setting="agentUiNavigation"
            description="Open files at a line, switch tabs and panels, fill in a message or a command for you. It never switches projects, sends for you, or presses Enter."
            control={<SettingSwitch setting="agentUiNavigation" />}
          />
          <SettingsRow
            setting="agentOrgAccess"
            description="In a cloud-bound project, read your organization's sessions, comments and conversations, and act there as you. Anything that reaches another person asks first."
            control={<SettingSwitch setting="agentOrgAccess" />}
          />
          <SettingsRow
            setting="agentCodeTools"
            description="Grep, find files, symbols, callers and search by meaning, in-process, respecting .gitignore and never reading secrets such as .env. Off: agents use their own tools."
            control={<SettingSwitch setting="agentCodeTools" />}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Models">
        <SettingsGroup>
          <SettingsRow
            setting="favoriteModels"
            status={
              settings.favoriteModels.length === 0
                ? "None starred yet. Star a model in the composer's model picker."
                : `${settings.favoriteModels.length} starred. The picker opens on them.`
            }
            noReset
            control={
              settings.favoriteModels.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void updateSettings({ favoriteModels: [] })}
                >
                  Clear
                </Button>
              ) : undefined
            }
          />
          <ModelPricingRow />
        </SettingsGroup>
      </SettingsSection>
    </SettingsPage>
  );
}

/** Atlas Agent and every installed agent. A saved id that is no longer
 *  installed stays listed, marked, so the select still shows what the file says. */
function DefaultAgentSelect() {
  const scoped = useScopedSetting("defaultAgent");
  // The primitive signature, not the arrays: see the store's header.
  useAgentRegistryStore((s) => s.signature);
  const catalog = useAgentRegistryStore.getState().catalog;
  const options = [
    { value: NATIVE_AGENT_ID, label: "Atlas Agent" },
    ...catalog
      .filter((entry) => entry.installed && entry.agentType !== NATIVE_AGENT_ID)
      .map((entry) => ({ value: entry.agentType, label: entry.name })),
  ];
  if (!options.some((option) => option.value === scoped.value)) {
    options.push({ value: scoped.value, label: `${scoped.value} (not installed)` });
  }
  return (
    <Select
      value={scoped.value}
      options={options}
      disabled={scoped.globalOnly}
      aria-label="New chats: Default agent"
      onValueChange={(next) => scoped.set(next)}
    />
  );
}

function ModelPricingRow() {
  const prices = useModelPricingStore.use.prices();
  const loading = useModelPricingStore.use.loading();
  const { load, refresh } = useModelPricingStore.use.actions();
  useEffect(() => {
    void load();
  }, [load]);
  const count = Object.keys(prices).filter((key) => key.includes("/")).length;
  const update = async () => {
    await refresh();
    const n = Object.keys(useModelPricingStore.getState().prices).filter((key) =>
      key.includes("/"),
    ).length;
    toast.success(`Model pricing updated: ${n} models`);
  };
  return (
    <SettingsRow
      anchor="model-pricing"
      title="Model pricing"
      description="Per-model prices from models.dev, shown in the model picker. Refreshed on launch."
      status={count > 0 ? `${count} models priced.` : "Not fetched yet."}
      control={
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void update()}>
          {loading ? "Updating…" : "Update"}
        </Button>
      }
    />
  );
}
