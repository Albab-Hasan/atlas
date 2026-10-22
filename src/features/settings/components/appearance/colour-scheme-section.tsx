/**
 * System / Light / Dark, as three pictures of the app rather than three words.
 *
 * Each card is a miniature of what that choice gives you: Light draws your
 * light theme, Dark your dark one, and System both, split down the middle. A
 * theme with only one variant draws that one — which is also what Atlas would
 * show (`resolveTheme` falls back to the variant it has).
 */

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/ui/icon";
import { appearanceForMode } from "@/features/theme/apply-theme";
import { previewTheme, type ThemePreview } from "@/features/theme/preview-theme";
import { ThemeMiniature } from "@/features/theme/components/theme-miniature";
import type { ThemeMode } from "@/features/theme/lib/theme-api";
import { useThemeStore } from "@/features/theme/stores/theme-store";
import { useSettingsStore } from "../../stores/settings-store";
import { SettingsSection } from "../layout/settings-layout";

const MODES = [
  { mode: "system", label: "System", icon: Monitor },
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
] as const satisfies readonly { mode: ThemeMode; label: string; icon: LucideIcon }[];

export function ColourSchemeSection() {
  const themeMode = useSettingsStore((s) => s.settings.themeMode);
  const themeLight = useSettingsStore((s) => s.settings.themeLight);
  const themeDark = useSettingsStore((s) => s.settings.themeDark);
  const { updateSettings } = useSettingsStore.use.actions();
  const lightTheme = useThemeStore((s) => s.loaded[themeLight]);
  const darkTheme = useThemeStore((s) => s.loaded[themeDark]);
  const light = lightTheme ? previewTheme(lightTheme, "light") : null;
  const dark = darkTheme ? previewTheme(darkTheme, "dark") : null;
  const index = Math.max(
    0,
    MODES.findIndex((m) => m.mode === themeMode),
  );

  // A radio group: one tab stop, arrows move the choice, as a native one does.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + MODES.length) % MODES.length;
    void updateSettings({ themeMode: MODES[next].mode });
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  };

  return (
    <SettingsSection title="Colour scheme" anchor="themeMode">
      <div
        role="radiogroup"
        aria-label="Colour scheme"
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-3"
      >
        {MODES.map(({ mode, label, icon }) => {
          const active = themeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => void updateSettings({ themeMode: mode })}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-2 text-left outline-none",
                "transition-colors duration-fast ease-out-strong focus-visible:ring-1 focus-visible:ring-ring",
                active ? "border-primary" : "border-border hover:border-border-strong",
              )}
            >
              <SchemePicture mode={mode} light={light} dark={dark} />
              <span
                className={cn(
                  "flex items-center justify-center gap-1.5 text-xs",
                  active ? "font-medium text-foreground" : "text-secondary-foreground",
                )}
              >
                <Icon icon={icon} size="sm" />
                {label}
                {mode === "system" && (
                  <span className="text-muted-foreground">· {appearanceForMode("system")}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}

function SchemePicture({
  mode,
  light,
  dark,
}: {
  mode: ThemeMode;
  light: ThemePreview | null;
  dark: ThemePreview | null;
}) {
  const frame = "relative h-28 overflow-hidden rounded-md border border-border-subtle";
  // The document is one `get_theme` away; hold the card's height meanwhile.
  if (!light || !dark) return <div className={cn(frame, "bg-element-selected")} />;
  if (mode !== "system") {
    return (
      <div className={frame}>
        <ThemeMiniature preview={mode === "light" ? light : dark} />
      </div>
    );
  }
  return (
    <div className={frame}>
      <ThemeMiniature preview={light} />
      <ThemeMiniature preview={dark} className="absolute inset-0 [clip-path:inset(0_0_0_50%)]" />
    </div>
  );
}
