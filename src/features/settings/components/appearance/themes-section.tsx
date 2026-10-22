/**
 * The theme library: every installed theme as a live miniature, and the way
 * in for new ones.
 *
 * Atlas wears two themes, one while it is light and one while it is dark
 * (`themeLight`, `themeDark`). Picking a card uses that theme for both; the
 * sun and moon on a card set just one half, so a light theme from one family
 * can sit beside a dark one from another. A ring on a swatch marks the half a
 * theme is filling. Importing opens in a dialog over the page — a shadcn, Zed
 * or VS Code theme converted by Rust, with the report of what mapped shown
 * before anything is written (`theme-import-panel.tsx`).
 */

import { memo, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Dialog, DialogContent } from "@/ui/dialog";
import { Icon } from "@/ui/icon";
import { Hint } from "@/ui/tooltip";
import { themeIdFor, useThemeStore } from "@/features/theme/stores/theme-store";
import { appearanceForMode } from "@/features/theme/apply-theme";
import { previewTheme, type ThemePreview } from "@/features/theme/preview-theme";
import { ThemeMiniature } from "@/features/theme/components/theme-miniature";
import type { Theme, ThemeAppearance, ThemeSummary } from "@/features/theme/lib/theme-api";
import type { AppSettings } from "../../lib/app-settings";
import { useSettingsStore } from "../../stores/settings-store";
import { SettingsSection } from "../layout/settings-layout";
import { ThemeImportPanel } from "../theme-import-panel";

export function ThemesSection() {
  const themeLight = useSettingsStore((s) => s.settings.themeLight);
  const themeDark = useSettingsStore((s) => s.settings.themeDark);
  const themeMode = useSettingsStore((s) => s.settings.themeMode);
  const { updateSettings } = useSettingsStore.use.actions();
  const themes = useThemeStore.use.themes();
  const loaded = useThemeStore.use.loaded();
  const skipped = useThemeStore.use.skipped();
  const loading = useThemeStore.use.loading();
  const error = useThemeStore.use.error();
  const { load, loadAll, reapply } = useThemeStore.use.actions();
  const [importing, setImporting] = useState(false);
  /** The variant a card's miniature shows while a swatch is hovered. */
  const [previewing, setPreviewing] = useState<Record<string, ThemeAppearance>>({});

  useEffect(() => {
    void load();
  }, [load]);

  // Every card resolves a full theme document, and the catalog only carries
  // summaries. Keyed on `themes` rather than run once, so the batch re-runs
  // after the file watcher drops the cache; `loadAll` skips what it already has.
  useEffect(() => {
    void loadAll();
  }, [loadAll, themes]);

  /** The appearance Atlas is in, so each miniature shows what you would see. */
  const appearance = appearanceForMode(themeMode);
  const showing = themeIdFor({ light: themeLight, dark: themeDark }, themeMode);

  // Stable, because `ThemeCard` is memoised: a card whose props did not change
  // must not re-render.
  const onPreview = useCallback((id: string, next: ThemeAppearance | null) => {
    setPreviewing(({ [id]: _previous, ...rest }) => (next ? { ...rest, [id]: next } : rest));
  }, []);

  const onPick = useCallback(
    (id: string, name: string, half: ThemeAppearance | "both") => {
      const patch: Partial<AppSettings> =
        half === "light"
          ? { themeLight: id }
          : half === "dark"
            ? { themeDark: id }
            : { themeLight: id, themeDark: id };
      // Writing the values already set changes nothing, and
      // `applySettingsSideEffects` — rightly — skips it. That made the obvious
      // way to pick up a hand-edit ("click it again") do nothing at all, so
      // ask the theme store directly instead.
      const unchanged =
        (patch.themeLight ?? themeLight) === themeLight &&
        (patch.themeDark ?? themeDark) === themeDark;
      if (unchanged) void reapply();
      else void updateSettings(patch);
      toast.success(half === "both" ? `Applied “${name}”` : `“${name}” is now your ${half} theme`);
    },
    [themeLight, themeDark, reapply, updateSettings],
  );

  return (
    <SettingsSection
      title="Themes"
      anchor="themeLight"
      description="Pick a card to use it in both light and dark, or the sun or moon to set just one."
      action={
        <Hint label="Convert a shadcn, Zed or VS Code theme">
          <Button size="sm" variant="ghost" onClick={() => setImporting(true)}>
            <Icon icon={Download} size="sm" />
            Import theme
          </Button>
        </Hint>
      }
    >
      {/* A file Rust could not load is skipped rather than fatal, which is
          what keeps the catalog alive — but it also means the theme you
          just saved simply never appears, with no clue why. Silent on a
          healthy install; the whole point on a broken one. */}
      {skipped.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning-muted p-2.5">
          <div className="flex items-center gap-1.5">
            <Icon icon={AlertTriangle} size="sm" className="text-warning" />
            <span className="text-xs font-medium text-foreground">
              {skipped.length === 1
                ? "1 theme file was skipped"
                : `${skipped.length} theme files were skipped`}
            </span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {skipped.map((warning) => (
              <li key={warning.key} className="text-2xs leading-snug text-muted-foreground">
                <span className="font-medium text-secondary-foreground">{warning.key}</span> —{" "}
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            summary={theme}
            full={loaded[theme.id]}
            showing={theme.id === showing}
            isLight={theme.id === themeLight}
            isDark={theme.id === themeDark}
            appearance={previewing[theme.id] ?? appearance}
            onPreview={onPreview}
            onPick={onPick}
          />
        ))}
      </div>

      {loading && themes.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
      )}
      {error && <p className="py-6 text-center text-xs text-error">{error}</p>}

      <Dialog open={importing} onOpenChange={setImporting}>
        <DialogContent
          showCloseButton={false}
          className="h-[min(40rem,calc(100vh-4rem))] max-w-[min(44rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
        >
          <ThemeImportPanel
            themes={themes}
            onClose={() => setImporting(false)}
            onImported={(id) => {
              // The watcher will re-list the catalog; applying it here is what
              // makes the import visibly land.
              void updateSettings({ themeLight: id, themeDark: id });
              void load();
            }}
          />
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

/**
 * One theme in the grid: a live preview of it, its name, and a swatch for each
 * variant it has.
 *
 * The card's OWN chrome — the border, the surface, the name — stays on the
 * active theme; only `ThemeMiniature` and the swatches carry the previewed
 * theme's colours, so nothing here has to be applied to be seen.
 *
 * Memoised, because a miniature is ~40 elements and 124 inline custom
 * properties: resolving a theme is free once cached, but reconciling every
 * card whenever one swatch is hovered is not. Every prop is stable — the
 * summaries come from the store, the documents from its `loaded` map, and the
 * two callbacks are `useCallback`ed above.
 */
const ThemeCard = memo(function ThemeCard({
  summary,
  full,
  showing,
  isLight,
  isDark,
  appearance,
  onPreview,
  onPick,
}: {
  summary: ThemeSummary;
  /** `undefined` until `loadAll` has the document. */
  full: Theme | undefined;
  /** This is the theme on screen right now. */
  showing: boolean;
  isLight: boolean;
  isDark: boolean;
  appearance: ThemeAppearance;
  onPreview: (id: string, appearance: ThemeAppearance | null) => void;
  onPick: (id: string, name: string, half: ThemeAppearance | "both") => void;
}) {
  const preview = full ? previewTheme(full, appearance) : null;
  const light = full && summary.hasLight ? previewTheme(full, "light") : null;
  const dark = full && summary.hasDark ? previewTheme(full, "dark") : null;

  return (
    <button
      type="button"
      onClick={() => onPick(summary.id, summary.name, "both")}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left",
        "transition-colors duration-fast ease-out-strong",
        showing
          ? "border-primary"
          : isLight || isDark
            ? "border-border-strong"
            : "border-border hover:border-border-strong",
      )}
    >
      {preview ? (
        <ThemeMiniature preview={preview} />
      ) : (
        // The document is one `get_theme` away, not a failure state. A flat
        // block of the right height keeps the grid from reflowing when it lands.
        <div className="h-28 w-full shrink-0 bg-element-selected" />
      )}

      <div className="flex w-full items-center gap-2 border-t border-border-subtle px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{summary.name}</p>
          <p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <span className="truncate">{summary.author}</span>
            {/* A theme that loaded but carries keys Atlas does not know. Those
                keys are preserved, not applied, so the author sees the name
                they typed do nothing until they are told. */}
            {summary.warnings.length > 0 && (
              <Hint
                label={
                  <span className="block max-w-64 whitespace-pre-line text-left">
                    {summary.warnings
                      .map((warning) => `${warning.key}: ${warning.message}`)
                      .join("\n")}
                  </span>
                }
              >
                <span
                  aria-label={`${summary.warnings.length} unknown theme key(s)`}
                  className="flex shrink-0 items-center gap-0.5 text-warning"
                >
                  <Icon icon={AlertTriangle} size="xs" />
                  {summary.warnings.length}
                </span>
              </Hint>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <HalfSwatch
            half="light"
            theme={summary}
            preview={light}
            chosen={isLight}
            onPreview={onPreview}
            onPick={onPick}
          />
          <HalfSwatch
            half="dark"
            theme={summary}
            preview={dark}
            chosen={isDark}
            onPreview={onPreview}
            onPick={onPick}
          />
        </div>
      </div>
    </button>
  );
});

/**
 * A theme's light or dark variant as a small disc in that variant's own
 * colours: its background, its foreground drawing the sun or moon, and a ring
 * in its brand colour when it is the half you have chosen. Clicking sets that
 * half to this theme; hovering swaps the card's miniature to it.
 *
 * A `<span role="button">` rather than a `<button>`: the whole card is already
 * the pick-both control, and a nested `<button>` is invalid inside it. The
 * `stopPropagation` keeps setting one half from also setting both.
 */
function HalfSwatch({
  half,
  theme,
  preview,
  chosen,
  onPreview,
  onPick,
}: {
  half: ThemeAppearance;
  theme: ThemeSummary;
  /** `null` when this theme has no such variant, or is not loaded yet. */
  preview: ThemePreview | null;
  chosen: boolean;
  onPreview: (id: string, appearance: ThemeAppearance | null) => void;
  onPick: (id: string, name: string, half: ThemeAppearance | "both") => void;
}) {
  if (!preview) return null;
  const label = chosen
    ? `${theme.name} is your ${half} theme`
    : `Use ${theme.name} as your ${half} theme`;
  return (
    <Hint label={label}>
      <span
        role="button"
        tabIndex={0}
        aria-pressed={chosen}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onPick(theme.id, theme.name, half);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onPick(theme.id, theme.name, half);
          }
        }}
        onMouseEnter={() => onPreview(theme.id, half)}
        onMouseLeave={() => onPreview(theme.id, null)}
        style={{
          backgroundColor: preview.swatch.background,
          color: preview.swatch.foreground,
          // A dark disc on a dark card has no edge of its own; its foreground
          // always contrasts with its background, so it draws one. Chosen, the
          // ring is the variant's brand colour instead.
          borderColor: chosen ? preview.swatch.primary : preview.swatch.foreground,
        }}
        className={cn(
          "flex size-6 cursor-pointer items-center justify-center rounded-full border outline-none",
          "transition-opacity duration-fast ease-out-strong focus-visible:ring-1 focus-visible:ring-ring",
          chosen ? "border-2 opacity-100" : "opacity-50 hover:opacity-100",
        )}
      >
        <Icon icon={half === "light" ? Sun : Moon} size="xs" />
      </span>
    </Hint>
  );
}
