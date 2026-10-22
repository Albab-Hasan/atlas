/**
 * The Settings sidebar: a search box over every setting, then the sections in
 * two groups. Collapses to an icon rail, with labels as tooltips.
 *
 * Search is the registry's: each `config.toml` key with a row is an item,
 * titled exactly as its row is (`settings-sections.ts`). Picking a result
 * opens its section and scrolls to the row, which flashes.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Hint } from "@/ui/tooltip";
import { Icon } from "@/ui/icon";
import { IconButton } from "@/ui/icon-button";
import { Kbd } from "@/ui/kbd";
import {
  ABOUT_ENTRY,
  SIDEBAR,
  searchSettings,
  type SearchItem,
  type SidebarEntry,
} from "../lib/settings-sections";
import type { SettingsSection } from "../stores/settings-nav-store";

export function SettingsSidebar({
  active,
  onSelect,
  onSearchPick,
  collapsed,
  onToggleCollapsed,
  badges,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  onSearchPick: (item: SearchItem) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  badges: Partial<Record<SettingsSection, number>>;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchSettings(query), [query]);

  // `/` focuses search while Settings is on screen, unless something editable
  // has focus already — never steal a keystroke from a field.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!rootRef.current || rootRef.current.offsetParent === null) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      if (collapsed) onToggleCollapsed();
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, onToggleCollapsed]);

  const pick = (item: SearchItem) => {
    onSearchPick(item);
    setQuery("");
    inputRef.current?.blur();
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (query) setQuery("");
      else inputRef.current?.blur();
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      setCursor((c) => Math.min(c + 1, results.length - 1));
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      setCursor((c) => Math.max(c - 1, 0));
      event.preventDefault();
    } else if (event.key === "Enter" && results[cursor]) {
      pick(results[cursor]);
      event.preventDefault();
    }
  };

  return (
    <nav
      ref={rootRef}
      aria-label="Settings sections"
      className={cn(
        "flex shrink-0 flex-col border-r border-border bg-background",
        collapsed ? "w-12" : "w-56",
      )}
    >
      {/* The same height and hairline as the page header beside it, so the
          search and the breadcrumb read as one bar across the panel. */}
      <div
        className={cn(
          "flex h-11 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center" : "px-2",
        )}
      >
        {collapsed ? (
          <Hint label="Search settings" shortcut="/" side="right">
            <IconButton
              icon={Search}
              size="sm"
              label="Search settings"
              onClick={onToggleCollapsed}
            />
          </Hint>
        ) : (
          <div className="relative w-full">
            <div className="flex h-control-lg items-center gap-2 rounded-md border border-border bg-panel-input px-2 focus-within:border-border-strong">
              <Icon icon={Search} size="sm" className="shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onSearchKey}
                placeholder="Search settings"
                aria-label="Search settings"
                role="combobox"
                aria-expanded={query.length > 0}
                aria-controls="settings-search-results"
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-disabled"
              />
              {query ? (
                <IconButton icon={X} size="xs" label="Clear search" onClick={() => setQuery("")} />
              ) : (
                <Kbd>/</Kbd>
              )}
            </div>
            {query && (
              <ul
                id="settings-search-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-popover mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-0.5 shadow-md"
              >
                {results.length === 0 ? (
                  <li className="px-2 py-2 caption">No settings found</li>
                ) : (
                  results.map((item, index) => (
                    <li
                      key={item.id}
                      role="option"
                      aria-selected={index === cursor}
                      onMouseEnter={() => setCursor(index)}
                      onMouseDown={(e) => {
                        // Before the input blurs, which would hide the list.
                        e.preventDefault();
                        pick(item);
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col rounded px-2 py-1.5",
                        index === cursor && "bg-element-hover",
                      )}
                    >
                      <span className="text-xs text-foreground">{item.title}</span>
                      <span className="caption">{item.where}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-3",
          collapsed ? "items-center px-1.5" : "px-2",
        )}
      >
        {SIDEBAR.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {!collapsed && <p className="eyebrow px-2 pb-1">{group.label}</p>}
            {group.entries.map((entry) => (
              <NavItem
                key={entry.id}
                entry={entry}
                active={active === entry.id}
                collapsed={collapsed}
                badge={badges[entry.id] ?? 0}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex flex-col gap-0.5 border-t border-border py-2",
          collapsed ? "items-center px-1.5" : "px-2",
        )}
      >
        <NavItem
          entry={ABOUT_ENTRY}
          active={active === ABOUT_ENTRY.id}
          collapsed={collapsed}
          badge={0}
          onSelect={onSelect}
        />
        <Hint label={collapsed ? "Show sidebar" : "Hide sidebar"} side="right">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "flex h-control-lg items-center rounded-md text-xs text-muted-foreground",
              "transition-colors duration-fast ease-out-strong hover:bg-element-hover hover:text-foreground",
              collapsed ? "w-full justify-center" : "gap-2 px-2",
            )}
          >
            <Icon icon={collapsed ? ChevronRight : ChevronLeft} size="sm" />
            {!collapsed && "Hide"}
          </button>
        </Hint>
      </div>
    </nav>
  );
}

function NavItem({
  entry,
  active,
  collapsed,
  badge,
  onSelect,
}: {
  entry: SidebarEntry;
  active: boolean;
  collapsed: boolean;
  badge: number;
  onSelect: (section: SettingsSection) => void;
}) {
  const item = (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(entry.id)}
      className={cn(
        "flex h-control-lg w-full items-center rounded-md text-xs whitespace-nowrap",
        "transition-colors duration-fast ease-out-strong",
        collapsed ? "justify-center" : "gap-2 px-2",
        active
          ? "bg-element-selected font-medium text-foreground"
          : "text-secondary-foreground hover:bg-element-hover hover:text-foreground",
      )}
    >
      <span className="relative flex shrink-0">
        <Icon icon={entry.icon} size="sm" />
        {collapsed && badge > 0 && (
          <span className="pointer-events-none absolute -top-1 -right-1 size-1.5 rounded-full bg-primary" />
        )}
      </span>
      {!collapsed && entry.label}
      {!collapsed && badge > 0 && (
        <span className="ml-auto h-4 min-w-4 rounded-full bg-primary px-1 text-center text-3xs leading-4 text-primary-foreground tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
  if (!collapsed) return item;
  const label =
    badge > 0 ? `${entry.label}: ${badge} update${badge === 1 ? "" : "s"} waiting` : entry.label;
  return (
    <Hint label={label} side="right">
      {item}
    </Hint>
  );
}
