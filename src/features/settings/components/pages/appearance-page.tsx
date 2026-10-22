/**
 * Everything about how Atlas looks, on one page, each choice drawn as what it
 * gives you: the colour scheme as three pictures of the app, themes and icon
 * themes as live previews, then the interface and its type.
 *
 * Nothing here changes what Atlas does — that is General and the pages after
 * it. Modelled on T3 Code's Appearance page.
 */

import { Minus, Plus } from "lucide-react";
import { isMac } from "@/lib/platform";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { Select } from "@/ui/select";
import { Hint } from "@/ui/tooltip";
import { useActionShortcut } from "@/features/keybindings/lib/use-action-shortcut";
import { useSettingsStore } from "../../stores/settings-store";
import { APP_ICONS } from "../../lib/app-icons";
import { clampScale, DEFAULT_SCALE, MAX_SCALE, MIN_SCALE, SCALE_STEP } from "../../lib/ui-scale";
import {
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "../layout/settings-layout";
import {
  SettingSelect,
  SettingSlider,
  SettingStepper,
  SettingText,
} from "../layout/setting-controls";
import { setInterfaceContrast } from "@/features/theme/apply-theme";
import { repaintTheme } from "@/features/theme/stores/theme-store";
import { ColourSchemeSection } from "../appearance/colour-scheme-section";
import { ThemesSection } from "../appearance/themes-section";
import { IconThemesSection } from "../appearance/icon-themes-section";

const CHAT_WIDTHS = [
  { value: "normal", label: "Normal", description: "760 pixels, the easiest line length to read." },
  { value: "wide", label: "Wide", description: "1080 pixels." },
  { value: "full", label: "Full", description: "The whole panel." },
] as const;

const DIFF_PALETTES = [
  { value: "theme", label: "Green and red", description: "The theme's own colours." },
  {
    value: "blue-orange",
    label: "Blue and orange",
    description: "Stays distinct with red-green colour blindness.",
  },
] as const;

export function AppearancePage() {
  const appIcon = useSettingsStore((s) => s.settings.appIcon);
  const { updateSettings } = useSettingsStore.use.actions();

  return (
    <SettingsPage
      title="Appearance"
      description="Themes, icons, fonts, and how the interface is drawn."
    >
      <ColourSchemeSection />
      <ThemesSection />
      <IconThemesSection />

      <SettingsSection title="Interface">
        <SettingsGroup>
          <SettingsRow setting="uiScale" control={<ZoomControl />} />
          <SettingsRow
            setting="interfaceContrast"
            control={
              <SettingSlider
                setting="interfaceContrast"
                step={5}
                unit="%"
                onPreview={(value) => {
                  setInterfaceContrast(value);
                  repaintTheme();
                }}
              />
            }
          />
          <SettingsRow
            setting="chatWidth"
            control={<SettingSelect setting="chatWidth" options={CHAT_WIDTHS} />}
          />
          <SettingsRow
            setting="diffPalette"
            control={<SettingSelect setting="diffPalette" options={DIFF_PALETTES} />}
          />
          {isMac && (
            <SettingsRow
              setting="appIcon"
              description="The icon in the Dock, Finder and Launchpad. Only the default is live Liquid Glass; the others are fixed renders of it."
              control={
                <Select
                  value={appIcon}
                  aria-label="App icon"
                  options={APP_ICONS.map((icon) => ({ value: icon.id, label: icon.label }))}
                  onValueChange={(next) => void updateSettings({ appIcon: next })}
                />
              }
            />
          )}
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection title="Typography">
        <SettingsGroup>
          <SettingsRow
            setting="uiFontFamily"
            control={<SettingText setting="uiFontFamily" placeholder="System font" />}
          />
          <SettingsRow
            setting="codeFontFamily"
            control={<SettingText setting="codeFontFamily" placeholder="SF Mono, JetBrains Mono" />}
          />
          <SettingsRow
            setting="editorFontSize"
            control={<SettingStepper setting="editorFontSize" unit="px" />}
          />
          <SettingsRow
            setting="terminalFontSize"
            control={<SettingStepper setting="terminalFontSize" unit="px" />}
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
