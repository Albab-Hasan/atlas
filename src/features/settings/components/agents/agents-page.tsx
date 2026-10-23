// Settings → Agents, after T3 Code's Providers page: one card, the agents the
// user has on the left and the picked one's settings on the right. Browsing
// the ACP registry for more is the Add agent dialog.

import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time-ago";
import { formatDateTime } from "@/lib/format-time";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";
import { IconButton } from "@/ui/icon-button";
import { Hint } from "@/ui/tooltip";
import { AgentMark } from "@/components/agent-mark";
import { useAgentRegistryStore } from "@/features/agents/stores/agent-registry-store";
import { SettingsPage, SettingsSection } from "../layout/settings-layout";
import {
  libraryItems,
  refreshListing,
  useAgentListing,
  useInstallProgress,
  useInstalls,
  useRevalidatedListing,
  type AgentItem,
} from "./agent-install";
import { AgentEditor, versionOf } from "./agent-editor";
import { AddAgentDialog } from "./add-agent-dialog";

export function AgentsPage() {
  useRevalidatedListing();
  useInstallProgress();
  const { registryEntries, catalogById, signature } = useAgentListing();
  const items = useMemo(
    () => libraryItems(registryEntries, catalogById),
    // `signature` moves whenever the arrays do; they are not stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A removed agent falls back to the first one rather than an empty pane.
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const [adding, setAdding] = useState(false);

  return (
    <SettingsPage
      title="Agents"
      description="Atlas Agent, and the ACP agents you add from the registry or already have on your PATH."
      wide
    >
      <SettingsSection
        title="Agents"
        action={
          <span className="flex items-center gap-1">
            <RefreshStatus />
            <Hint label="Add agent">
              <IconButton icon={Plus} size="sm" label="Add agent" onClick={() => setAdding(true)} />
            </Hint>
          </span>
        }
      >
        <RegistryNote />
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card @min-[40rem]:grid @min-[40rem]:h-150 @min-[40rem]:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b border-border bg-panel @min-[40rem]:border-r @min-[40rem]:border-b-0">
            <ul
              aria-label="Agents"
              className="min-h-0 flex-1 divide-y divide-border-subtle overflow-y-auto"
            >
              {items.map((item) => (
                <li key={item.id}>
                  <AgentListRow
                    item={item}
                    selected={item.id === selected?.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-2.5 px-3 py-3 text-left text-sm text-muted-foreground transition-colors duration-fast hover:bg-element-hover hover:text-foreground"
                >
                  <Icon icon={Plus} size="sm" />
                  Add agent
                </button>
              </li>
            </ul>
          </div>
          <div className="min-h-0 min-w-0 overflow-y-auto">
            {selected ? (
              <AgentEditor key={selected.id} item={selected} />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Loading agents…</p>
            )}
          </div>
        </div>
      </SettingsSection>

      <AddAgentDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(id) => setSelectedId(id)}
      />
    </SettingsPage>
  );
}

/** "Checked 5m ago", and a button that checks again. */
function RefreshStatus() {
  const refreshing = useAgentRegistryStore((s) => s.registryRefreshing);
  const refreshedAt = useAgentRegistryStore((s) => s.registryRefreshedAt);
  const ago = timeAgo(refreshedAt, { suffix: true });
  return (
    <Hint
      label={refreshedAt ? `Last checked ${formatDateTime(refreshedAt)}` : "Check the registry"}
    >
      <Button
        variant="ghost"
        size="xs"
        disabled={refreshing}
        aria-busy={refreshing}
        onClick={() => void refreshListing()}
      >
        <Icon icon={RefreshCw} size="xs" className={cn(refreshing && "animate-spin")} />
        {refreshing ? "Checking…" : ago ? `Checked ${ago}` : "Check for updates"}
      </Button>
    </Hint>
  );
}

/** Says when the registry couldn't be reached, and what is shown instead. */
function RegistryNote() {
  const error = useAgentRegistryStore((s) => s.registryError);
  const refreshedAt = useAgentRegistryStore((s) => s.registryRefreshedAt);
  const count = useAgentRegistryStore((s) => s.registryEntries.length);
  if (!error) return null;
  return (
    <p className="caption px-1">
      {count > 0
        ? `Couldn't reach the ACP registry (${error}). Showing what it listed${refreshedAt ? ` ${formatDateTime(refreshedAt)}` : " last time"}.`
        : `Couldn't reach the ACP registry (${error}). Your agents still work.`}
    </p>
  );
}

function AgentListRow({
  item,
  selected,
  onSelect,
}: {
  item: AgentItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const installs = useInstalls();
  const version = versionOf(item);
  const status = listStatus(item, installs.installing(item.id));
  return (
    <button
      type="button"
      aria-current={selected || undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-fast",
        selected ? "bg-element-selected" : "hover:bg-element-hover",
      )}
    >
      <span className="flex h-5 shrink-0 items-center text-foreground">
        <AgentMark agentType={item.agentType} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
          {version && (
            <span className="shrink-0 font-mono text-2xs text-muted-foreground">v{version}</span>
          )}
        </span>
        <span
          className={cn(
            "text-2xs",
            status.tone === "warning" ? "text-warning" : "text-muted-foreground",
          )}
        >
          {status.text}
        </span>
      </span>
    </button>
  );
}

function listStatus(item: AgentItem, installing: boolean): { text: string; tone?: "warning" } {
  if (installing) return { text: "Adding…" };
  if (item.state === "native") return { text: "Built in" };
  if (item.state === "detected") return { text: "On your PATH · not added" };
  if (item.catalog?.source === "unavailable") return { text: "Can't start", tone: "warning" };
  if (item.entry?.updateAvailable) return { text: `Update available · v${item.entry.version}` };
  if (item.catalog?.source === "npx") return { text: "Installed · runs through npx" };
  return { text: "Installed" };
}
