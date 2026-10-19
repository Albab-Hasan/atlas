import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useSessionFiles } from "@/features/chat/lib/session-files";
import { parseDiff } from "../lib/diff";
import { useDiffJump } from "../lib/diff-jump";
import { DiffFilesView } from "./commit-view";

/**
 * What a thread has changed, as the commit tab shows a commit: every file the
 * session touched, diffed working tree against HEAD, in the order the session
 * first touched them. Opened from the thread overview's Changes card, which
 * then steers it file by file (`requestDiffJump`).
 *
 * The file list is the capture record's (shell edits included); the diff is
 * git's, so it is the files' state NOW — a file the thread changed and that has
 * since been committed or reverted has nothing left to show, and says so.
 */
export function SessionChangesView({
  tabId,
  projectPath,
  sessionId,
}: {
  tabId: string;
  projectPath: string;
  sessionId: string;
}) {
  const recorded = useSessionFiles(projectPath, sessionId);
  const paths = useMemo(() => recorded.filter((f) => !f.outOfRepo).map((f) => f.path), [recorded]);
  // The record refreshes after every turn; its per-file counts move when an
  // edit lands, which is when the diff is worth re-reading.
  const version = useMemo(
    () => recorded.map((f) => `${f.path}:${f.lastTurnSeq}:${f.added}:${f.removed}`).join("|"),
    [recorded],
  );
  const { data: diff, isLoading } = useQuery({
    queryKey: ["session-diff", projectPath, sessionId, version],
    queryFn: async () =>
      // An unmocked command resolves null in the browser harness.
      (await invoke<string | null>("git_diff_paths", { path: projectPath, files: paths })) ?? "",
    enabled: paths.length > 0,
    placeholderData: keepPreviousData,
  });

  const files = useMemo(() => {
    const order = new Map(paths.map((p, i) => [p, i]));
    return parseDiff(diff ?? "").sort(
      (a, b) => (order.get(a.path) ?? Infinity) - (order.get(b.path) ?? Infinity),
    );
  }, [diff, paths]);
  const clean = useMemo(() => {
    const shown = new Set(files.map((f) => f.path));
    return paths.filter((p) => !shown.has(p));
  }, [files, paths]);

  const jump = useDiffJump(tabId);

  if (isLoading && !diff) {
    return (
      <div className="px-3 py-8 text-center text-xs text-muted-foreground">Loading changes…</div>
    );
  }

  return (
    <DiffFilesView
      files={files}
      repoPath={projectPath}
      commit={null}
      jump={jump}
      emptyText={
        paths.length === 0
          ? "This thread hasn't changed any files."
          : "Nothing uncommitted is left from this thread."
      }
      header={
        <div className="shrink-0 border-b border-border px-4 py-2.5">
          <div className="text-sm font-medium text-foreground">Changes in this thread</div>
          <div className="text-2xs text-muted-foreground">
            Uncommitted changes to the {paths.length} {paths.length === 1 ? "file" : "files"} this
            thread touched
          </div>
          {clean.length > 0 && (
            <div className="mt-1 truncate text-2xs text-muted-foreground" title={clean.join("\n")}>
              No uncommitted changes in {clean.map((p) => p.split("/").pop()).join(", ")}
            </div>
          )}
        </div>
      }
    />
  );
}
