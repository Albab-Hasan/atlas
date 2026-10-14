/**
 * The Timeline board: every captured Session, by day, on the whole tab.
 *
 * This replaced a 280px nav whose rows could say a title and a time and
 * nothing else — which model ran, whose work it was, what it changed and how
 * much it cost all meant opening the Session to find out. Those are the facts
 * you choose a Session *by*, so the board is now the page and a row carries
 * them ({@link SessionRow}).
 *
 * The frame is a centred column: a reading measure, not a stretched table.
 * One sticky date names the day you are in and changes as you scroll
 * ({@link TimelineCalendar}); the filters sit in the header beside the title;
 * the search bar floats at the foot over a fade, where your hands are, rather
 * than competing with the filters at the top.
 */

import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardSession } from "../types";
import { boardKey } from "../lib/board-key";
import { dayHeading, startOfDay } from "../lib/board";
import type { AuthorDirectory } from "../lib/author-directory";
import { DayMeta, SessionRow } from "./session-row";
import { TimelineCalendar, type CalendarDay } from "./timeline-calendar";

export function TimelineBoard({
  sessions,
  directory,
  openKey,
  loading,
  narrowed,
  query,
  onQuery,
  onOpen,
  filters,
  note,
}: {
  /** Already scoped by the filters and the search — the board only groups. */
  sessions: BoardSession[];
  directory: AuthorDirectory;
  /** The row to mark as open, as a {@link boardKey} key. */
  openKey: string | null;
  loading: boolean;
  /** A filter or a query is on, so "nothing here" means "nothing matched". */
  narrowed: boolean;
  query: string;
  onQuery: (next: string) => void;
  onOpen: (session: BoardSession) => void;
  /** The filter pills, in the header beside the title. */
  filters?: ReactNode;
  /** A standing note under the list — what the board is NOT showing. */
  note?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const days = useMemo<CalendarDay[]>(() => {
    // Insertion order is the store's order — newest first — so grouping needs
    // no second sort.
    const byDay = new Map<number, BoardSession[]>();
    for (const s of sessions) {
      const key = startOfDay(new Date(s.lastActivityAt));
      const bucket = byDay.get(key);
      if (bucket) bucket.push(s);
      else byDay.set(key, [s]);
    }
    return [...byDay.entries()].map(([key, list]) => ({
      id: String(key),
      ...dayHeading(new Date(key)),
      meta: <DayMeta sessions={list} directory={directory} />,
      children: (
        <ul className="divide-y divide-border-subtle">
          {list.map((s) => {
            const rowKey = boardKey(s);
            return (
              <li key={rowKey}>
                <SessionRow
                  session={s}
                  directory={directory}
                  selected={rowKey === openKey}
                  onOpen={() => onOpen(s)}
                />
              </li>
            );
          })}
        </ul>
      ),
    }));
  }, [sessions, directory, openKey, onOpen]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="@container hide-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col px-2 @5xl:px-10">
          <div className="relative mx-auto flex w-full max-w-232 flex-1 flex-col gap-6 px-5 pt-8 pb-32">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-medium tracking-tight">Timeline</h1>
              <div className="flex flex-wrap items-center gap-2">{filters}</div>
            </header>

            {days.length > 0 ? (
              <TimelineCalendar days={days} root={scroller as RefObject<HTMLElement | null>} />
            ) : (
              <p className="py-20 text-center text-xs text-muted-foreground">
                {loading
                  ? "Loading sessions…"
                  : narrowed
                    ? "No sessions match."
                    : "No sessions captured yet."}
              </p>
            )}

            {note}
          </div>
        </div>
      </div>

      {/* The search, at the foot of the list: a fade so rows sink under it,
          then the bar. At the foot because it is a thing you reach for while
          reading, not a filter you set before you start. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-[var(--card)]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-3.5">
        <label
          className={cn(
            "pointer-events-auto flex h-10 w-full max-w-155 items-center gap-2.5",
            "rounded-full border border-border bg-[var(--card)]/80 px-4 shadow-md backdrop-blur-xl",
          )}
        >
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                onQuery("");
              }
            }}
            placeholder="Search sessions…"
            aria-label="Search sessions"
            spellCheck={false}
            maxLength={256}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[var(--atlas-text-disabled)]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onQuery("");
                searchRef.current?.focus();
              }}
              className="grid size-control-xs shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-element-hover hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </label>
      </div>
    </div>
  );
}
