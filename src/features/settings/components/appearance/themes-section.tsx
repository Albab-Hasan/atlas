/**
 * The theme library: every installed theme as a live miniature, and the way
 * in for new ones.
 *
 * Picking a card applies the theme; the Dark/Light swatches on a card swap
 * only that card's miniature, so both variants can be seen before choosing.
 * Importing opens in a dialog over the page — a shadcn, Zed or VS Code theme
 * converted by Rust, with the report of what mapped shown before anything is
 * written (`theme-import-panel.tsx`).
 */

import { memo, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Dialog, DialogContent } from "@/ui/dialog";
import { Icon } from "@/ui/icon";
import { Hint } from "@/ui/tooltip";
import { useThemeStore } from "@/features/theme/stores/theme-store";
import { appearanceForMode } from "@/features/theme/apply-theme";
import { previewTheme, type ThemePreview } from "@/features/theme/preview-theme";
import { ThemeMiniature } from "@/features/theme/components/theme-miniature";
import type { Theme, ThemeAppearance, ThemeSummary } from "@/features/theme/lib/theme-api";
import { useSettingsStore } from "../../stores/settings-store";
import { SettingsSection } from "../layout/settings-layout";
import { ThemeImportPanel } from "../theme-import-panel";

export function ThemesSection() {
  const settings = useSettingsStore.use.settings();
  const { updateSettings } = useSettingsStore.use.actions();
  const themes = useThemeStore.use.themes();
  const loaded = useThemeStore.use.loaded();
  const skipped = useThemeStore.use.skipped();
  const loading = useThemeStore.use.loading();
  const error = useThemeStore.use.error();
  const { load, loadAll, reapply } = useThemeStore.use.actions();
  const [importing, setImporting] = useState(false);
  /** Per-card appearance override — see `AppearanceSwatch`. */
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

  /** What the user would actually get if they clicked a card right now. */
  const appearance = appearanceForMode(settings.themeMode);

  // Both stable, because `ThemeCard` is memoised: a card whose props did not
  // change must not re-render.
  const onPreview = useCallback((id: string, next: ThemeAppearance) => {
    setPreviewing((state) => ({ ...state, [id]: next }));
  }, []);

  const onApply = useCallback(
    (id: string, name: string) => {
      // Clicking the theme you are already on writes the same id back, and
      // `applySettingsSideEffects` — rightly — skips a value that did not
      // change. That made the obvious way to pick up a hand-edit ("click it
      // again") do nothing at all, so ask the theme store directly instead.
      if (id === settings.theme) void reapply();
      else updateSettings({ theme: id });
      toast.success(`Applied “${name}” theme`);
    },
    [settings.theme, reapply, updateSettings],
  );

  return (
    <SettingsSection
      title="Themes"
      anchor="theme"
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
            selected={theme.id === settings.theme}
            appearance={previewing[theme.id] ?? appearance}
            onPreview={onPreview}
            onApply={onApply}
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
              updateSettings({ theme: id });
              void load();
            }}
          />
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

/**
 * One theme in the grid: a live preview of the theme, the name, and the
 * dark/light affordance.
 *
 * The card's OWN chrome — the selected border, the card surface, the name —
 * stays on the active theme; only `ThemeMiniature` carries the previewed
 * theme's variables, so nothing here has to be applied to be seen.
 *
 * Memoised, because a miniature is ~40 elements and 124 inline custom
 * properties: resolving a theme is free once cached, but reconciling fifteen
 * of these on every search keystroke is not. Every prop is stable — the
 * summaries come from the store, the documents from its `loaded` map, and the
 * two callbacks are `useCallback`ed above — so a keystroke only pays for the
 * cards that actually appear or disappear.
 */
const ThemeCard = memo(function ThemeCard({
  summary,
  full,
  selected,
  appearance,
  onPreview,
  onApply,
}: {
  summary: ThemeSummary;
  /** `undefined` until `loadAll` has the document. */
  full: Theme | undefined;
  selected: boolean;
  appearance: ThemeAppearance;
  onPreview: (id: string, appearance: ThemeAppearance) => void;
  onApply: (id: string, name: string) => void;
}) {
  const preview = full ? previewTheme(full, appearance) : null;
  const dark = full && summary.hasDark ? previewTheme(full, "dark") : null;
  const light = full && summary.hasLight ? previewTheme(full, "light") : null;

  return (
    <button
      type="button"
      onClick={() => onApply(summary.id, summary.name)}
      className={cn(
        "flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-colors",
        "bg-card",
        selected ? "border-primary" : "border-border hover:border-border-strong",
      )}
    >
      {preview ? (
        <ThemeMiniature preview={preview} />
      ) : (
        // The document is one `get_theme` away, not a failure state. A flat
        // block of the right height keeps the grid from reflowing when it lands.
        <div className="h-28 w-full shrink-0 bg-element-selected" />
      )}

      <div className="flex w-full items-start gap-1.5 border-t border-border-subtle p-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{summary.name}</span>
            {selected && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{summary.author}</span>
            {!summary.builtIn && (
              <span className="shrink-0 text-3xs uppercase tracking-wide text-disabled">Local</span>
            )}
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
                  <AlertTriangle size={9} />
                  {summary.warnings.length}
                </span>
              </Hint>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <AppearanceSwatch
            label="Dark"
            theme={summary.name}
            preview={dark}
            active={preview?.appearance === "dark"}
            onPick={() => onPreview(summary.id, "dark")}
          />
          <AppearanceSwatch
            label="Light"
            theme={summary.name}
            preview={light}
            active={preview?.appearance === "light"}
            onPick={() => onPreview(summary.id, "light")}
          />
        </div>
      </div>
    </button>
  );
});

/**
 * The "this theme also has a light variant" affordance, and the control that
 * swaps the miniature to it.
 *
 * Thirteen of the fifteen built-ins now ship both, and a card that previewed
 * only the appearance you happen to be in would hide half of what you are
 * choosing. So the two variants are always both on the card — each swatch is
 * painted in ITS OWN variant's background, foreground and brand colour, which
 * says "there is a light one, and it looks like this" without a click. The
 * miniature still opens on the appearance the current `themeMode` would give
 * you; clicking a swatch swaps it, for that card only, without applying
 * anything.
 *
 * A `<span role="button">` rather than a `<button>`: the whole card is already
 * the apply control, and a nested `<button>` is invalid inside it. Same shape
 * as the icon picker's remove control, including the `stopPropagation` that
 * keeps swapping the preview from also applying the theme.
 */
function AppearanceSwatch({
  label,
  theme,
  preview,
  active,
  onPick,
}: {
  label: string;
  theme: string;
  /** `null` when this theme has no such variant, or is not loaded yet. */
  preview: ThemePreview | null;
  active: boolean;
  onPick: () => void;
}) {
  if (!preview) return null;
  return (
    <Hint label={`Preview ${theme} in ${label.toLowerCase()}`}>
      <span
        role="button"
        tabIndex={0}
        aria-pressed={active}
        aria-label={`Preview ${theme} in ${label.toLowerCase()}`}
        onClick={(event) => {
          event.stopPropagation();
          onPick();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") event.currentTarget.click();
        }}
        style={{
          backgroundColor: preview.swatch.background,
          color: preview.swatch.foreground,
          // Never transparent: a dark variant's swatch is near-black on a
          // near-black card, and with no edge it simply vanished. Its own
          // foreground always contrasts with its own background — that is what
          // makes it a foreground — so the edge is legible in either variant,
          // and the brand colour is what marks the one being shown.
          borderColor: active ? preview.swatch.primary : preview.swatch.foreground,
        }}
        className={cn(
          "flex h-4 cursor-pointer items-center gap-0.5 rounded-sm border px-1",
          "text-3xs font-medium uppercase tracking-wide transition-opacity",
          active ? "opacity-100" : "opacity-60 hover:opacity-100",
        )}
      >
        <span className="size-1 rounded-full" style={{ backgroundColor: preview.swatch.primary }} />
        {label}
      </span>
    </Hint>
  );
}
