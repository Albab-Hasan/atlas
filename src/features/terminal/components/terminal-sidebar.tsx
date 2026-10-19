import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, Reorder } from "motion/react";
import {
  Columns2,
  Loader2,
  Maximize2,
  Plus,
  Rows2,
  Search,
  Terminal as TerminalIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { basename, tildePath } from "@/lib/paths";
import { HintGroup, HintItem } from "@/ui/hint-group";
import { Hint } from "@/ui/tooltip";
import { useTerminalStore, type PaneNode } from "../stores/terminal-store";
import { terminalSessions, type TerminalSession } from "../lib/terminal-session";
import { fetchTermGit, type TermGit } from "../lib/term-git";

/**
 * A pane's terminals as a side list, the way cmux lists its workspaces: one
 * tall row per shell carrying where it is (directory, branch), what it is doing
 * (the running command, and for how long) and how long it has been open. Rows
 * drag to reorder.
 *
 * The pane is a size container: under `@[480px]/pane` the list folds to a
 * column of status glyphs, so a three-way split keeps its terminals usable.
 *
 * Its width is the agent chat sidebar's default, so the two side lists line up
 * when a terminal tab sits beside a chat tab in a split.
 */
const SIDEBAR_WIDTH = 220;
export function TerminalSidebar({
  pane,
  tabId,
  zoomed,
  hasSplits,
}: {
  pane: PaneNode;
  tabId: string;
  zoomed?: boolean;
  hasSplits: boolean;
}) {
  const {
    addTerminalToPane,
    splitPane,
    closeTerminalInPane,
    closePane,
    setActiveTerminalInPane,
    setActivePane,
    toggleZoom,
    reorderTerminalsInPane,
  } = useTerminalStore.use.actions();
  const anyBusy = useTerminalStore((s) => pane.terminals.some((id) => s.busy[id]));
  // Seconds matter while a command runs; "open for" moves in minutes.
  const now = useNow(anyBusy ? 1000 : 30_000);

  // The drag reorders a local copy and commits once, on drop: committing per
  // hovered slot would re-render the pane's terminals on every step. Rendered
  // through the store's list so a terminal closed mid-drag can't linger.
  const [order, setOrder] = useState(pane.terminals);
  const dragging = useRef(false);
  useEffect(() => {
    if (!dragging.current) setOrder(pane.terminals);
  }, [pane.terminals]);
  const live = new Set(pane.terminals);
  const shown = [
    ...order.filter((id) => live.has(id)),
    ...pane.terminals.filter((id) => !order.includes(id)),
  ];
  const orderRef = useRef(shown);
  orderRef.current = shown;

  const select = (ptyId: string) => {
    setActiveTerminalInPane(tabId, pane.id, ptyId);
    setActivePane(tabId, pane.id);
  };

  // Filters the rows by where they are and what they run — the directory,
  // the branch, the command — the way the chat sidebar's search filters its
  // threads. Matching happens in the row, which is where those facts live.
  const [query, setQuery] = useState("");

  return (
    <aside
      className="flex w-10 shrink-0 flex-col border-r border-border bg-[var(--sidebar)] @[480px]/pane:w-(--terminal-sidebar-width)"
      style={{ "--terminal-sidebar-width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}
    >
      <HintGroup>
        {/* The chat sidebar's search row, with the pane's actions trailing. */}
        <div className="flex shrink-0 flex-col items-center gap-0.5 border-b border-border bg-background py-1 @[480px]/pane:h-[32px] @[480px]/pane:flex-row @[480px]/pane:gap-1.5 @[480px]/pane:py-0 @[480px]/pane:pr-1.5 @[480px]/pane:pl-3">
          <Search size={11} className="hidden shrink-0 text-muted-foreground @[480px]/pane:block" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search terminals"
            placeholder="Search…"
            className="hidden min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground @[480px]/pane:block"
          />
          {zoomed && (
            <span className="hidden shrink-0 rounded bg-element-selected px-1.5 py-px text-3xs text-muted-foreground @[480px]/pane:inline">
              zoomed
            </span>
          )}
          <HintItem label="New terminal">
            <button
              onClick={() => {
                addTerminalToPane(tabId, pane.id);
                setActivePane(tabId, pane.id);
              }}
              className={HEADER_BUTTON}
            >
              <Plus size={11} />
            </button>
          </HintItem>
          <HintItem label="Split right">
            <button
              onClick={() => splitPane(tabId, pane.id, "horizontal")}
              className={HEADER_BUTTON}
            >
              <Columns2 size={11} />
            </button>
          </HintItem>
          <HintItem label="Split down">
            <button onClick={() => splitPane(tabId, pane.id, "vertical")} className={HEADER_BUTTON}>
              <Rows2 size={11} />
            </button>
          </HintItem>
          {hasSplits && (
            <HintItem label={zoomed ? "Unzoom pane" : "Zoom pane"}>
              <button
                onClick={() => toggleZoom(tabId, pane.id)}
                className={cn(HEADER_BUTTON, zoomed && "text-foreground")}
              >
                <Maximize2 size={11} />
              </button>
            </HintItem>
          )}
          {hasSplits && (
            <HintItem label="Close pane">
              <button onClick={() => closePane(tabId, pane.id)} className={HEADER_BUTTON}>
                <X size={11} />
              </button>
            </HintItem>
          )}
        </div>
      </HintGroup>

      <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto p-1 hide-scrollbar">
        <Reorder.Group
          as="div"
          axis="y"
          values={shown}
          onReorder={setOrder}
          className="flex flex-col gap-0.5"
        >
          {shown.map((ptyId) => (
            <TerminalRow
              key={ptyId}
              ptyId={ptyId}
              query={query.trim().toLowerCase()}
              active={ptyId === pane.activeTerminalId}
              closable={pane.terminals.length > 1}
              now={now}
              onSelect={() => select(ptyId)}
              onClose={() => closeTerminalInPane(tabId, pane.id, ptyId)}
              onDragStart={() => {
                dragging.current = true;
              }}
              onDragEnd={() => {
                dragging.current = false;
                reorderTerminalsInPane(tabId, pane.id, orderRef.current);
              }}
            />
          ))}
        </Reorder.Group>
      </motion.div>
    </aside>
  );
}

const HEADER_BUTTON =
  "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-element-hover hover:text-secondary-foreground";

function TerminalRow({
  ptyId,
  query,
  active,
  closable,
  now,
  onSelect,
  onClose,
  onDragStart,
  onDragEnd,
}: {
  ptyId: string;
  /** Lower-cased, trimmed. Empty shows every row. */
  query: string;
  active: boolean;
  closable: boolean;
  now: number;
  onSelect: () => void;
  onClose: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const session = useSession(ptyId);
  const summary = useSummary(session);
  const git = useRowGit(summary.cwd, summary.command !== null);
  // A drag ends in a click on the row it dropped; that click is not a pick.
  const dragged = useRef(false);
  // Lifted over its neighbours while it travels past them.
  const [lifted, setLifted] = useState(false);

  const dir = summary.cwd && summary.cwd !== "~" ? basename(summary.cwd) : "~";
  const where = summary.cwd ? tildePath(summary.cwd) : "~";
  if (
    query &&
    ![where, summary.cwd, git?.branch ?? "", summary.command ?? ""].some((s) =>
      s.toLowerCase().includes(query),
    )
  ) {
    return null;
  }
  const status = summary.exited
    ? "Exited"
    : summary.command !== null
      ? `${summary.command} · ${formatAge(now - (summary.startedAt ?? now), true)}`
      : session
        ? `Idle · open ${formatAge(now - session.createdAt, false)}`
        : "Starting…";

  return (
    <Reorder.Item
      as="div"
      value={ptyId}
      onDragStart={() => {
        dragged.current = true;
        setLifted(true);
        onDragStart();
      }}
      onDragEnd={() => {
        setLifted(false);
        onDragEnd();
      }}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-current={active || undefined}
      aria-label={`${dir}, ${status}`}
      title={`${where}${git ? ` — ${git.branch || "(detached)"}` : ""}\n${status}`}
      className={cn(
        "group/row relative flex cursor-pointer items-start justify-center gap-2 rounded-md bg-[var(--sidebar)] p-2 outline-none select-none",
        "transition-colors focus-visible:ring-1 focus-visible:ring-ring @[480px]/pane:justify-start",
        lifted && "z-10 shadow-md",
        active
          ? "bg-element-selected text-foreground"
          : "text-secondary-foreground hover:bg-element-hover",
      )}
    >
      <span className="mt-px flex size-3.5 shrink-0 items-center justify-center">
        {summary.command !== null ? (
          <Loader2 size={11} className="animate-spin text-primary" aria-hidden />
        ) : (
          <TerminalIcon
            size={11}
            className={summary.exited ? "text-muted-foreground/50" : "text-muted-foreground"}
            aria-hidden
          />
        )}
      </span>

      <span className="hidden min-w-0 flex-1 flex-col gap-0.5 @[480px]/pane:flex">
        <span
          className={cn(
            "truncate text-xs font-medium",
            active ? "text-foreground" : "text-secondary-foreground",
          )}
        >
          {dir}
        </span>
        <span className="truncate font-mono text-3xs text-muted-foreground">
          {git && (
            <span className="text-secondary-foreground">
              {git.branch || "(detached)"}
              {git.dirty && "*"}
              {" • "}
            </span>
          )}
          {where}
        </span>
        <span
          className={cn(
            "truncate text-3xs",
            summary.command !== null
              ? "font-mono text-secondary-foreground"
              : "text-muted-foreground",
          )}
        >
          {status}
        </span>
      </span>

      {closable && (
        <Hint label="Close terminal">
          <button
            type="button"
            aria-label="Close terminal"
            // Keep the press from starting a row drag.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="hidden size-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-element-hover hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 @[480px]/pane:flex"
          >
            <X size={10} />
          </button>
        </Hint>
      )}
    </Reorder.Item>
  );
}

// ── Reading a session without re-rendering per output chunk ────────────────

/** The registered session for a terminal, once its view has acquired it.
 *
 *  Never `acquire` here: that would start a shell for an id the store already
 *  closed. The row renders before the pane's terminals do, so on the first
 *  pass the session may not exist yet; the effect picks it up after commit. */
function useSession(ptyId: string): TerminalSession | undefined {
  const [session, setSession] = useState(() => terminalSessions.get(ptyId));
  useEffect(() => {
    const s = terminalSessions.get(ptyId);
    if (s !== session) setSession(s);
  });
  return session;
}

interface Summary {
  cwd: string;
  exited: boolean;
  /** The foreground command, while one runs. */
  command: string | null;
  startedAt: number | null;
}

const EMPTY: Summary = { cwd: "", exited: false, command: null, startedAt: null };
const noSubscribe = () => () => {};

/** The few fields a row shows, as a value that only changes when they do —
 *  the session publishes on every parsed chunk, and a row re-rendering at
 *  output rate behind a busy build would be all cost. */
function useSummary(session: TerminalSession | undefined): Summary {
  const cache = useRef<Summary>(EMPTY);
  const get = useCallback((): Summary => {
    if (!session) return EMPTY;
    const snap = session.getSnapshot();
    const last = snap.blocks[snap.blocks.length - 1];
    const running = !!last && last.running && last.command !== "";
    const command = running ? last.command : null;
    const startedAt = running ? last.startedAt : null;
    const c = cache.current;
    if (
      c.cwd === snap.cwd &&
      c.exited === snap.exited &&
      c.command === command &&
      c.startedAt === startedAt
    ) {
      return c;
    }
    cache.current = { cwd: snap.cwd, exited: snap.exited, command, startedAt };
    return cache.current;
  }, [session]);
  return useSyncExternalStore(session?.subscribe ?? noSubscribe, get, get);
}

/** Branch for the row, re-read when the directory changes or a command
 *  finishes — the same moments, and the same debounce, as the footer badge,
 *  so the visible terminal's two asks share one `git status`. */
function useRowGit(cwd: string, busy: boolean): TermGit | null {
  const [git, setGit] = useState<TermGit | null>(null);
  useEffect(() => {
    if (!cwd || cwd === "~") {
      setGit(null);
      return;
    }
    if (busy) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetchTermGit(cwd).then((g) => {
        if (!cancelled) setGit(g);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [cwd, busy]);
  return git;
}

/** A clock for the list, paused while the window is hidden. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    let timer: number | null = null;
    const start = () => {
      if (timer === null && !document.hidden) {
        timer = window.setInterval(() => setNow(Date.now()), intervalMs);
      }
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
  return now;
}

/** "12s" / "4m" / "2h 5m". Seconds only for a running command; an open
 *  shell's age reads "<1m" until it has one. */
export function formatAge(ms: number, seconds: boolean): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return seconds ? `${s}s` : "<1m";
  const m = Math.floor(s / 60);
  if (m < 60) return seconds && m < 10 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h}h` : `${h}h ${m % 60}m`;
}
