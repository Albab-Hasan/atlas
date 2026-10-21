import { Minus, Plus } from "lucide-react";
import { isMac, isWindows } from "@/lib/platform";
import { useAppProfile } from "@/lib/app-profile";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { Select } from "@/ui/select";
import { Hint } from "@/ui/tooltip";
import { useActionShortcut } from "@/features/keybindings/lib/use-action-shortcut";
import { useFeedbackStore } from "@/features/feedback/stores/feedback-store";
import { useSettingsStore } from "../../stores/settings-store";
import { APP_ICONS } from "../../lib/app-icons";
import { clampScale, DEFAULT_SCALE, MAX_SCALE, MIN_SCALE, SCALE_STEP } from "../../lib/ui-scale";
import {
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "../layout/settings-layout";
import { SettingSwitch } from "../layout/setting-controls";
import { ConfigErrorBanner } from "./config-file";

export function GeneralPage() {
  const settings = useSettingsStore.use.settings();
  const { updateSettings } = useSettingsStore.use.actions();
  // `.atlas` in the released app, `.atlas-dev` in a dev-profile build, which
  // also keeps it out of git through `.git/info/exclude` rather than editing
  // the project's own `.gitignore`.
  const { dev: devProfile, dirName: atlasDir, productName } = useAppProfile();

  return (
    <SettingsPage
      title="General"
      description="Interface, the app icon, and how Atlas treats your project's files."
    >
      <ConfigErrorBanner />

      <SettingsSection title="Interface">
        <SettingsGroup>
          <SettingsRow setting="uiScale" control={<ZoomControl />} />
          {isMac && (
            <SettingsRow
              setting="appIcon"
              description="The icon in the Dock, Finder and Launchpad. Only the default is live Liquid Glass; the others are fixed renders of it."
              control={
                <Select
                  value={settings.appIcon}
                  aria-label="App icon"
                  options={APP_ICONS.map((icon) => ({ value: icon.id, label: icon.label }))}
                  onValueChange={(appIcon) => void updateSettings({ appIcon })}
                />
              }
            />
          )}
          <SettingsRow
            setting="keepAwakeWhileRunning"
            description={`Keep your ${isMac ? "Mac" : "computer"} from sleeping while an agent is working. The display can still turn off.`}
            disabled={isWindows}
            disabledReason="Not available on Windows yet."
            control={<SettingSwitch setting="keepAwakeWhileRunning" />}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Files">
        <SettingsGroup>
          <SettingsRow
            setting="autoAddAtlasGitignore"
            title={devProfile ? `Keep ${atlasDir} out of git` : `Add ${atlasDir} to .gitignore`}
            description={
              devProfile
                ? `${productName} lists ${atlasDir}/ in each git project's .git/info/exclude, so its caches stay out of version control without editing your .gitignore.`
                : `Atlas adds ${atlasDir}/, where it keeps its caches and state, to each git project's .gitignore when it opens.`
            }
            control={<SettingSwitch setting="autoAddAtlasGitignore" />}
          />
          <SettingsRow
            setting="showHiddenFiles"
            control={<SettingSwitch setting="showHiddenFiles" />}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Help">
        <SettingsGroup>
          <SettingsRow
            anchor="send-feedback"
            title="Send feedback"
            description="Report a bug, request a feature, or tell us what feels clumsy, with an optional screenshot."
            control={
              <Button
                variant="outline"
                size="sm"
                onClick={() => useFeedbackStore.getState().actions.openPanel("settings")}
              >
                Send feedback
              </Button>
            }
          />
        </SettingsGroup>
      </SettingsSection>
    </SettingsPage>
  );
}

/** Interface zoom stepper. Also reachable anywhere via the view.zoom* shortcuts. */
function ZoomControl() {
  const uiScale = useSettingsStore((s) => s.settings.uiScale);
  const { updateSettings } = useSettingsStore.use.actions();
  const setScale = (next: number) => void updateSettings({ uiScale: clampScale(next) });
  const zoomIn = useActionShortcut("view.zoomIn")?.label;
  const zoomOut = useActionShortcut("view.zoomOut")?.label;
  const zoomReset = useActionShortcut("view.zoomReset")?.label;

  return (
    <div className="flex items-center gap-1">
      <Hint label="Zoom out" shortcut={zoomOut}>
        <IconButton
          icon={Minus}
          size="sm"
          variant="outline"
          label="Zoom out"
          className="rounded-full"
          disabled={uiScale <= MIN_SCALE}
          onClick={() => setScale(uiScale - SCALE_STEP)}
        />
      </Hint>
      <Hint label="Reset to 100%" shortcut={zoomReset}>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-12 tabular-nums"
          onClick={() => setScale(DEFAULT_SCALE)}
        >
          {Math.round(uiScale * 100)}%
        </Button>
      </Hint>
      <Hint label="Zoom in" shortcut={zoomIn}>
        <IconButton
          icon={Plus}
          size="sm"
          variant="outline"
          label="Zoom in"
          className="rounded-full"
          disabled={uiScale >= MAX_SCALE}
          onClick={() => setScale(uiScale + SCALE_STEP)}
        />
      </Hint>
    </div>
  );
}
