import { useMemo } from "react";

import { useChatStore } from "../stores/chat-store";
import {
  childCallsByParent,
  orderedSubagents,
  subagentsOfMessage,
  tallySubagents,
  type SubagentTally,
} from "../lib/subagents";
import type { Subagent, ToolCallDisplay } from "@/types/agent";

/*
 * Reading a session's delegated children.
 *
 * Every hook here subscribes to ONE store field and derives the rest with
 * `useMemo` over that reference. That is deliberate and not a style choice:
 * immer gives `session.subagents` a new identity only when something in it
 * changed, so the subscription compares with `Object.is` and settles. A
 * selector that built the array itself — `(s) => orderedSubagents(...)` — would
 * allocate on every call and re-render forever, with or without `useShallow`,
 * which is one level deep and cannot see into records of objects.
 *
 * Nothing here ticks. A live child's elapsed time belongs to the frame that
 * paints it: use the `LiveElapsed` pattern in `transcript-rows.tsx`, which
 * writes the figure straight to the DOM once a second and skips React
 * entirely. Putting `Date.now()` in this layer would re-render every subagent
 * row every second for a number only one span shows.
 */

const NO_SUBAGENTS: readonly Subagent[] = Object.freeze([]);

/**
 * Every child this tab's session has delegated to, in launch order.
 *
 * Not per-turn: an earlier turn's children stay here, anchored to the message
 * that launched them, until the transcript itself is replaced. Empty for the
 * overwhelming majority of sessions — a surface should render nothing at all
 * rather than an empty container.
 */
export function useSubagents(tabId: string | null | undefined): readonly Subagent[] {
  const map = useChatStore((s) => (tabId ? s.sessions[tabId]?.subagents : undefined));
  return useMemo(() => (map ? orderedSubagents(map) : NO_SUBAGENTS), [map]);
}

/** Counts for a header or badge, without the list. Same single subscription. */
export function useSubagentTally(tabId: string | null | undefined): SubagentTally {
  const list = useSubagents(tabId);
  return useMemo(() => tallySubagents(list), [list]);
}

/** Whether this session has delegated at all — the cheapest read there is, and
 *  the one that decides whether a subagent surface exists for this tab.
 *  Returns a boolean, so the subscription never re-renders on child updates. */
export function useHasSubagents(tabId: string | null | undefined): boolean {
  return useChatStore((s) => {
    const map = tabId ? s.sessions[tabId]?.subagents : undefined;
    return map !== undefined && Object.keys(map).length > 0;
  });
}

/** One child by its launching call id, for a detail view opened on a row. */
export function useSubagent(
  tabId: string | null | undefined,
  toolCallId: string | null | undefined,
): Subagent | undefined {
  return useChatStore((s) =>
    tabId && toolCallId ? s.sessions[tabId]?.subagents?.[toolCallId] : undefined,
  );
}

/**
 * The children one assistant message launched, for a transcript that places
 * rows in flow rather than in a panel.
 */
export function useSubagentsOfMessage(
  tabId: string | null | undefined,
  messageId: string,
): readonly Subagent[] {
  const all = useSubagents(tabId);
  return useMemo(() => {
    const mine = subagentsOfMessage(all, messageId);
    return mine.length > 0 ? mine : NO_SUBAGENTS;
  }, [all, messageId]);
}

const NO_CALLS: ReadonlyMap<string, ToolCallDisplay[]> = Object.freeze(new Map());

/**
 * Every tool call the transcript attributes to a child, bucketed by child.
 *
 * Gated on the session HAVING children, because the cost is a pass over the
 * whole message list and the answer is an empty map for nearly every session.
 * The result is empty for the native engine's children whatever the
 * transcript holds — they run on their own threads and their calls never reach
 * this session (`hasAttributedWork` is the question to ask before rendering a
 * count or a nested list).
 */
export function useChildToolCalls(
  tabId: string | null | undefined,
): ReadonlyMap<string, ToolCallDisplay[]> {
  const hasAny = useHasSubagents(tabId);
  const messages = useChatStore((s) => (tabId ? s.sessions[tabId]?.messages : undefined));
  return useMemo(
    () => (hasAny && messages ? childCallsByParent(messages) : NO_CALLS),
    [hasAny, messages],
  );
}
