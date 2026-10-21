/**
 * Controls bound to one `config.toml` key: the value comes from the settings
 * store, and a change saves it. Rows use these instead of re-wiring
 * `updateSettings` by hand for every switch.
 */

import { Switch } from "@/ui/switch";
import { Select, type SelectOption } from "@/ui/select";
import { useSettingsStore } from "../../stores/settings-store";
import type { AppSettings, BooleanSettingKey } from "../../lib/app-settings";
import { settingMeta } from "../../lib/settings-sections";

/** "Needs you: System notification", not just "System notification": one page
 *  can hold several rows with the same title, one per section, and a screen
 *  reader moving between controls hears only this name. */
function accessibleName(setting: keyof AppSettings): string {
  const meta = settingMeta(setting);
  return `${meta.section}: ${meta.title}`;
}

export function SettingSwitch({
  setting,
  disabled,
  onChange,
}: {
  setting: BooleanSettingKey;
  disabled?: boolean;
  /** Runs after the value is saved — for a side effect the store can't own. */
  onChange?: (next: boolean) => void;
}) {
  const checked = useSettingsStore((s) => s.settings[setting]);
  const { updateSettings } = useSettingsStore.use.actions();
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      aria-label={accessibleName(setting)}
      onCheckedChange={(next) => {
        void updateSettings({ [setting]: next } as Partial<AppSettings>);
        onChange?.(next);
      }}
    />
  );
}

type EnumKey = {
  [K in keyof AppSettings]: AppSettings[K] extends string
    ? string extends AppSettings[K]
      ? never
      : K
    : never;
}[keyof AppSettings];

/** A select over an enum key's values; `options` gives each value its label. */
export function SettingSelect<K extends EnumKey>({
  setting,
  options,
  disabled,
}: {
  setting: K;
  options: readonly SelectOption<AppSettings[K] & string>[];
  disabled?: boolean;
}) {
  const value = useSettingsStore((s) => s.settings[setting]) as AppSettings[K] & string;
  const { updateSettings } = useSettingsStore.use.actions();
  return (
    <Select
      value={value}
      options={options}
      disabled={disabled}
      aria-label={accessibleName(setting)}
      onValueChange={(next) => void updateSettings({ [setting]: next } as Partial<AppSettings>)}
    />
  );
}
