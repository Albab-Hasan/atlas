// The thread overview — a rail docked to the right of the conversation.
//
// It answers the questions a long turn raises that the thread itself answers
// badly, because the answer is scattered through it: how many children are
// running, what this conversation has changed, what it remembered. Claude
// Desktop's right rail ("Background tasks · 3 running") and t3code's thread
// details panel are the two references.
//
// Like the comments panel it is DOCKED, not an overlay: it takes layout space
// and the transcript reflows narrower beside it. An overlay over a transcript
// the reader is following would cover the thing the rail is describing.
//
// Contract with the transcript, inherited from `detail-panel`: opening,
// resizing or collapsing a section must not re-render a single transcript row.
// Nothing here writes to the chat store, and the rail's own state lives in
// `thread-overview-store`.

import { lazy, Suspense, useMemo } from "react";
import { ChevronRight, PanelRightClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/features/app/stores/app-store";

import { openDetail } from "../stores/detail-panel-store";
import { useChatStore } from "../stores/chat-store";
import {
  OVERVIEW_SECTIONS,
  SECTION_TITLE,
  useThreadOverviewStore,
  type OverviewSection,
} from "../stores/thread-overview-store";
import { useSubagents } from "../hooks/use-subagents";
import { elapsedMs, isRunning, tallySubagents } from "../lib/subagents";
import { formatDiffStat, tallyChanges } from "../lib/thread-overview";
import { formatWorked, LiveElapsed } from "./transcript-rows";

const MemoryUpdatedCard = lazy(() =>
  import("@/features/memory/components/memory-updated-card").then((m) => ({
    default: m.MemoryUpdatedCard,
  })),
);

// ── Section chrome ─────────────────────────────────────────────────────────

/**
 * One collapsible section. The header is always a row with a count on the
 * right, whether or not the section is open — that count is the whole value of
 * a collapsed rail, and a section that hid it would have to be opened to be
 * read.
 */
function Section({
  id,
  status,
  children,
}: {
  id: OverviewSection;
  /** The right-hand figure: "3 running", "+58 −26". Empty hides the slot. */
  status: string;
  children: React.ReactNode;
}) {
  const collapsed = useThreadOverviewStore((s) => Boolean(s.collapsed[id]));
  const { toggleSection } = useThreadOverviewStore.use.actions();
  return (
    <section className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => toggleSection(id)}
        className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-left hover:bg-[var(--muted)]"
      >
        <ChevronRight
          size={12}
          strokeWidth={2}
          className={cn("shrink-0 text-[var(--muted-foreground)]", !collapsed && "rotate-90")}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--secondary-foreground)]">
          {SECTION_TITLE[id]}
        </span>
        {status && (
          <span className="shrink-0 font-mono text-2xs text-[var(--atlas-text-disabled)] tabular-nums">
            {status}
          </span>
        )}
      </button>
      {!collapsed && <div className="px-3 pb-2">{children}</div>}
    </section>
  );
}

/** What a section says when it has nothing — one muted line, never an empty
 *  box with a heading over it. */
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-2xs text-[var(--atlas-text-disabled)]">{children}</p>;
}

// ── Sections ───────────────────────────────────────────────────────────────

function SubagentsSection({ tabId }: { tabId: string }) {
  const children = useSubagents(tabId);
  const tally = useMemo(() => tallySubagents(children), [children]);
  // "3 running" while any is live, else the total — which is the figure
  // Claude Desktop puts beside its own Background tasks header, and the only
  // one that changes while you watch.
  const status =
    tally.running > 0 ? `${tally.running} running` : tally.total > 0 ? `${tally.total}` : "";

  return (
    <Section id="subagents" status={status}>
      {children.length === 0 ? (
        <Empty>No agents delegated to.</Empty>
      ) : (
        <ul className="m-0 list-none space-y-0.5 p-0">
          {children.map((child) => (
            <li key={child.toolCallId}>
              {/* Opens the child's own body beside the thread, the same target
                  its transcript row opens — one subagent, one place to read it. */}
              <button
                type="button"
                onClick={() =>
                  openDetail(tabId, { kind: "subagent", toolCallId: child.toolCallId })
                }
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm py-0.5 text-left hover:bg-[var(--muted)]"
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    child.status === "running"
                      ? "bg-[var(--primary)] atlas-marker-running"
                      : child.status === "failed"
                        ? "bg-[var(--atlas-status-error-foreground)]"
                        : "bg-[var(--atlas-text-disabled)]",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--secondary-foreground)]">
                  {child.name.trim() || "Subagent"}
                </span>
                <span className="shrink-0 font-mono text-2xs text-[var(--atlas-text-disabled)] tabular-nums">
                  {isRunning(child) ? (
                    <LiveElapsed startedAt={child.startedAtMs} minMs={1000} />
                  ) : (
                    formatWorked(elapsedMs(child, Date.now()))
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ChangesSection({ tabId }: { tabId: string }) {
  const messages = useChatStore((s) => s.sessions[tabId]?.messages);
  const tally = useMemo(() => tallyChanges(messages ?? []), [messages]);
  return (
    <Section id="changes" status={formatDiffStat(tally.added, tally.removed)}>
      {tally.files.length === 0 ? (
        <Empty>
          {tally.readCount > 0 ? `${tally.readCount} files read, none changed.` : "No changes yet."}
        </Empty>
      ) : (
        <ul className="m-0 list-none space-y-0.5 p-0">
          {tally.files.map((file) => (
            <li key={file.path} className="flex items-center gap-2 py-0.5">
              <span
                className="min-w-0 flex-1 truncate text-xs text-[var(--secondary-foreground)]"
                title={file.path}
              >
                {file.path.split("/").pop()}
              </span>
              <span className="shrink-0 font-mono text-2xs tabular-nums">
                {file.added > 0 && (
                  <span className="text-[var(--atlas-diff-added-text)]">+{file.added}</span>
                )}
                {file.removed > 0 && (
                  <span className="ml-1 text-[var(--atlas-status-error-foreground)]">
                    −{file.removed}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MemoriesSection({ tabId }: { tabId: string }) {
  const projectPath = useAppStore.use.currentProject()?.path ?? null;
  const acpSessionId = useChatStore((s) => s.sessions[tabId]?.acpSessionId ?? null);
  return (
    <Section id="memories" status="">
      <Suspense fallback={null}>
        {/* The card renders nothing when the session wrote no memories, which
            is its own emptiness rule — duplicating one here would mean two
            answers to the same question. */}
        <MemoryUpdatedCard projectPath={projectPath} sessionId={acpSessionId} />
      </Suspense>
    </Section>
  );
}

const SECTION_VIEW: Record<OverviewSection, (props: { tabId: string }) => React.ReactNode> = {
  subagents: SubagentsSection,
  changes: ChangesSection,
  memories: MemoriesSection,
};

// ── Panel ──────────────────────────────────────────────────────────────────

export function ThreadOverviewPanel({ tabId }: { tabId: string }) {
  const width = useThreadOverviewStore.use.width();
  const { close } = useThreadOverviewStore.use.actions();

  return (
    <aside
      aria-label="Thread overview"
      style={{ width }}
      className="relative flex h-full max-w-[50%] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--sidebar)] animate-slide-in-right"
    >
      <header className="flex h-9 shrink-0 items-center gap-1.5 border-b border-[var(--border)] px-3">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--secondary-foreground)]">
          Overview
        </span>
        <button
          type="button"
          aria-label="Close overview"
          onClick={() => close(tabId)}
          className="shrink-0 cursor-pointer rounded-sm p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--secondary-foreground)]"
        >
          <PanelRightClose size={14} strokeWidth={2} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {OVERVIEW_SECTIONS.map((id) => {
          const View = SECTION_VIEW[id];
          return <View key={id} tabId={tabId} />;
        })}
      </div>
    </aside>
  );
}
