/**
 * System / Light / Dark, as three pictures of the app rather than three words.
 *
 * Each card sketches the app in what that choice gives you: Light in your
 * light theme, Dark in your dark one, and System both, split down the middle. A
 * theme with only one variant draws that one — which is also what Atlas would
 * show (`resolveTheme` falls back to the variant it has).
 */

import { cn } from "@/lib/utils";
import { previewTheme, type ThemePreview } from "@/features/theme/preview-theme";
import type { ThemeMode } from "@/features/theme/lib/theme-api";
import { useThemeStore } from "@/features/theme/stores/theme-store";
import { useSettingsStore } from "../../stores/settings-store";
import { SettingsSection } from "../layout/settings-layout";

const MODES = [
  { mode: "system", label: "System" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
] as const satisfies readonly { mode: ThemeMode; label: string }[];

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
        {MODES.map(({ mode, label }) => {
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
                  "text-center text-xs",
                  active ? "font-medium text-foreground" : "text-secondary-foreground",
                )}
              >
                {label}
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
  const frame = "relative h-24 overflow-hidden rounded-md border border-border-subtle";
  // The document is one `get_theme` away; hold the card's height meanwhile.
  if (!light || !dark) return <div className={cn(frame, "bg-element-selected")} />;
  if (mode !== "system") {
    return (
      <div className={frame}>
        <SchemeSketch preview={mode === "light" ? light : dark} />
      </div>
    );
  }
  return (
    <div className={frame}>
      <SchemeSketch preview={light} />
      <SchemeSketch preview={dark} className="absolute inset-0 [clip-path:inset(0_0_0_50%)]" />
    </div>
  );
}

/**
 * The app as shapes, not content: a sidebar of rows, a thread, a floating
 * panel and the composer with its send button. A colour scheme is about light
 * against dark, so the sketch carries surfaces, hairlines and the one accent,
 * and leaves syntax and terminal colours to the theme cards' own orbs.
 *
 * `preview.vars` scopes every utility below to the previewed theme.
 */
function SchemeSketch({ preview, className }: { preview: ThemePreview; className?: string }) {
  const bar = "h-1 rounded-full bg-border";
  return (
    <div aria-hidden style={preview.vars} className={cn("flex size-full bg-background", className)}>
      <div className="flex w-1/5 shrink-0 flex-col gap-1.5 border-r border-border-subtle bg-sidebar p-2">
        <div className="h-2 rounded-sm bg-element-selected" />
        <div className={cn(bar, "w-4/5")} />
        <div className={cn(bar, "w-3/5")} />
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col p-2.5">
        <div className={cn(bar, "ml-auto mb-2 h-1.5 w-1/4 bg-element-selected")} />
        <div className={cn(bar, "mb-1.5 w-1/2")} />
        <div className={cn(bar, "w-1/3")} />
        <div className="absolute top-2.5 right-2.5 flex w-1/5 flex-col gap-1 rounded-sm border border-border-subtle bg-card p-1">
          <span className="flex items-center gap-0.5">
            <span className="size-1 rounded-full bg-success" />
            <span className={cn(bar, "flex-1")} />
          </span>
          <span className="flex items-center gap-0.5">
            <span className="size-1 rounded-full bg-primary" />
            <span className={cn(bar, "flex-1")} />
          </span>
          <span className="flex items-center gap-0.5">
            <span className="size-1 rounded-full bg-warning" />
            <span className={cn(bar, "flex-1")} />
          </span>
        </div>
        <div className="mt-auto flex h-4 items-center gap-1 rounded-full border border-border-subtle bg-card px-1.5">
          <span className={cn(bar, "w-1/3")} />
          <span className="ml-auto size-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
