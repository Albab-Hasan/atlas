/**
 * The Settings page vocabulary: page → section → group → row.
 *
 * Modelled on T3 Code's settings and drawn in the timeline's style (the
 * standards repo's `SettingCard` / `SectionHeader` / `PageHeader`):
 *
 * - A **page** is a centred column with a page header, like the timeline.
 * - A **section** is a small eyebrow heading over one **group**, a bordered
 *   card whose rows are separated by hairlines.
 * - A **row** is a title, one sentence under it, and the control on the right.
 *   Its layout is a container query, so it stacks inside a narrow panel, not
 *   just a narrow window.
 *
 * A row that names a `setting` reads its title and sentence from the settings
 * registry (`settings-registry.gen.ts`), so the label a user sees, the label
 * search finds, and the docs table are one string. It also gets a reset
 * button, shown only while the value differs from its default — that button
 * is the whole "modified" indicator, because every control saves as it
 * changes and there is never a Save step.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/ui/icon-button";
import { Hint } from "@/ui/tooltip";
import { useSettingsStore } from "../../stores/settings-store";
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from "../../lib/app-settings";
import { settingMeta, isDefaultValue } from "../../lib/settings-sections";
import { useSettingsNav } from "../../stores/settings-nav-store";

export function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="@container mx-auto flex w-full max-w-180 flex-col gap-8 px-5 pt-8 pb-24">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight text-foreground">{title}</h1>
        {description && <p className="caption">{description}</p>}
      </header>
      {children}
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Right-aligned in the header — a button or a small switch. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="eyebrow">{title}</h2>
          {description && <p className="caption">{description}</p>}
        </div>
        {action && <div className="shrink-0 pb-0.5">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** The card a section's rows sit in, hairlines between them. */
export function SettingsGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        "divide-y divide-border-subtle",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SettingsRowProps {
  /** A registry key: supplies the title and description, the search anchor,
   *  and the reset-to-default button. */
  setting?: SettingKey;
  /** Overrides the registry title, or names a row with no setting behind it. */
  title?: ReactNode;
  /** Overrides the registry summary. */
  description?: ReactNode;
  /** A second muted line under the description: a status, a path. */
  status?: ReactNode;
  /** The control, right-aligned (stacked under the text in a narrow panel). */
  control?: ReactNode;
  /** Content under the row, inside the same card cell: a sub-list, a preview. */
  children?: ReactNode;
  /** The row is greyed out and inert. Pair with `disabledReason`. */
  disabled?: boolean;
  /** Shown as a tooltip over the control while disabled. */
  disabledReason?: string;
  /** Search anchor for a row with no `setting`. */
  anchor?: string;
  /** Hide the reset button even when the value differs from its default. */
  noReset?: boolean;
}

export function SettingsRow({
  setting,
  title,
  description,
  status,
  control,
  children,
  disabled = false,
  disabledReason,
  anchor,
  noReset = false,
}: SettingsRowProps) {
  const meta = setting ? settingMeta(setting) : undefined;
  const value = useSettingsStore((s) => (setting ? s.settings[setting] : undefined));
  const { updateSettings } = useSettingsStore.use.actions();
  const rowTitle = title ?? meta?.title;
  const showReset =
    setting !== undefined && !noReset && !disabled && !isDefaultValue(setting, value);
  const ref = useSearchTarget(anchor ?? setting);

  // `inert`, not just `pointer-events-none`: a disabled row's switch or select
  // must not take focus or a Space/Enter from the keyboard either. The outer
  // span keeps one tab stop so the reason is still reachable by keyboard.
  const controlNode =
    control && disabled && disabledReason ? (
      <Hint label={disabledReason}>
        <span className="inline-flex" tabIndex={0}>
          <span inert className="inline-flex disabled-look">
            {control}
          </span>
        </span>
      </Hint>
    ) : control && disabled ? (
      <span inert className="inline-flex disabled-look">
        {control}
      </span>
    ) : (
      control
    );

  return (
    <div
      ref={ref}
      data-setting-anchor={anchor ?? setting}
      className={cn("@container/settings-row px-4", children ? "pt-3 pb-3" : "py-3")}
    >
      <div
        className={cn(
          "flex flex-col gap-2.5",
          "@min-[32rem]/settings-row:grid @min-[32rem]/settings-row:grid-cols-[minmax(0,1fr)_auto]",
          "@min-[32rem]/settings-row:items-center @min-[32rem]/settings-row:gap-8",
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-0.5", disabled && "opacity-50")}>
          <div className="flex min-h-5 items-center gap-1">
            <h3 className="label">{rowTitle}</h3>
            {showReset && (
              <Hint label="Reset to default">
                <IconButton
                  icon={Undo2}
                  size="xs"
                  label={`Reset ${typeof rowTitle === "string" ? rowTitle : setting} to default`}
                  onClick={() =>
                    void updateSettings({
                      [setting]: DEFAULT_SETTINGS[setting],
                    } as Partial<AppSettings>)
                  }
                />
              </Hint>
            )}
          </div>
          {(description ?? meta?.summary) && (
            <p className="max-w-xl text-2xs text-muted-foreground">
              {description ?? meta?.summary}
            </p>
          )}
          {status && <p className="caption pt-0.5">{status}</p>}
        </div>
        {controlNode && (
          <div className="flex w-full min-w-0 shrink-0 items-center gap-2 @min-[32rem]/settings-row:w-auto @min-[32rem]/settings-row:justify-end">
            {controlNode}
          </div>
        )}
      </div>
      {children && <div className="pt-3">{children}</div>}
    </div>
  );
}

/**
 * Scroll to, focus and flash this element when a search result or a deep
 * link names it. The nav store carries the pending anchor; the row that
 * owns it consumes it, so a target on a page that has not rendered yet is
 * picked up as soon as it does.
 */
function useSearchTarget(anchor: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const pending = useSettingsNav((s) => s.anchor);
  const clearAnchor = useSettingsNav((s) => s.clearAnchor);
  useEffect(() => {
    const el = ref.current;
    if (!el || !anchor || pending !== anchor) return;
    clearAnchor();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    el.classList.remove("atlas-jump-flash");
    // Restart the animation when the same row is targeted twice in a row.
    void el.offsetWidth;
    el.classList.add("atlas-jump-flash");
    const timer = window.setTimeout(() => el.classList.remove("atlas-jump-flash"), 1300);
    return () => window.clearTimeout(timer);
  }, [anchor, pending, clearAnchor]);
  return ref;
}

/** A plain-language empty or unavailable state inside a group. */
export function SettingsNote({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-2xs text-muted-foreground">{children}</p>;
}
