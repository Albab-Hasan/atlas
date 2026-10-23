// The right pane of Settings → Agents: one agent's settings. A header with
// its name and version and the actions that change what is installed, then
// one section per concern, like T3 Code's provider editor.

import type { ReactNode } from "react";
import { ArrowUpCircle, Globe, MoreHorizontal, Trash2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tildePath } from "@/lib/paths";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";
import { IconButton } from "@/ui/icon-button";
import { Hint } from "@/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { AtlasLoader } from "@/components/atlas-loader";
import { AgentMark } from "@/components/agent-mark";
import { GithubIcon } from "@/components/github-icon";
import { useAgentRegistryStore } from "@/features/agents/stores/agent-registry-store";
import { updatePhaseLabel } from "@/features/agents/lib/agent-update";
import { SettingsGroup, SettingsRow, SettingsSection } from "../layout/settings-layout";
import {
  installAgent,
  installKind,
  removeAgent,
  updateAgentTo,
  useInstalls,
  type AgentItem,
} from "./agent-install";
import { AtlasAgentPermissions, StarredModels } from "./agent-settings-sections";

/** The version on this machine: what is installed, else what would install. */
export function versionOf(item: AgentItem): string | null {
  return item.entry?.installedVersion ?? item.catalog?.version ?? item.entry?.version ?? null;
}

export function AgentEditor({ item }: { item: AgentItem }) {
  const version = versionOf(item);
  const description = item.catalog?.description ?? item.entry?.description;
  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="flex shrink-0 items-center text-foreground">
            <AgentMark agentType={item.agentType} size="lg" />
          </span>
          <h2 className="min-w-0 truncate text-base font-medium text-foreground">{item.name}</h2>
          {version && <span className="font-mono text-2xs text-muted-foreground">v{version}</span>}
          <span className="flex-1" />
          <HeaderActions item={item} />
        </div>
        {description && <p className="caption">{description}</p>}
      </header>

      <StatusSection item={item} />
      {item.state === "native" && <AtlasAgentPermissions />}
      {(item.state === "native" || item.catalog?.supportsModels) && (
        <StarredModels agentType={item.agentType} />
      )}
      <RuntimeSection item={item} />
      <CapabilitiesSection item={item} />
    </div>
  );
}

function HeaderActions({ item }: { item: AgentItem }) {
  const repository = item.catalog?.repository ?? item.entry?.repository;
  const website = item.catalog?.website ?? item.entry?.website;
  const removable = item.state === "installed";
  if (!repository && !website && !removable) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<IconButton icon={MoreHorizontal} size="sm" label={`${item.name} actions`} />}
      />
      <DropdownMenuContent align="end" className="min-w-44">
        {repository && (
          <DropdownMenuItem onClick={() => void openUrl(repository)}>
            <GithubIcon size={12} />
            Open repository
          </DropdownMenuItem>
        )}
        {website && (
          <DropdownMenuItem onClick={() => void openUrl(website)}>
            <Icon icon={Globe} size="sm" />
            Open website
          </DropdownMenuItem>
        )}
        {removable && (
          <DropdownMenuItem variant="destructive" onClick={() => void removeAgent(item)}>
            <Icon icon={Trash2} size="sm" />
            Remove {item.name}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The one thing to do about this agent right now, when there is one: add a
 *  detection, update, or say why it can't start. */
function StatusSection({ item }: { item: AgentItem }) {
  const installs = useInstalls();
  const phase = useAgentRegistryStore((s) => s.updatePhases[item.id] ?? null);
  const entry = item.entry;
  let row: ReactNode = null;

  if (item.state === "detected" && entry) {
    const busy = installs.installing(item.id);
    row = (
      <SettingsRow
        title="Not added yet"
        description="Atlas found it on your PATH. Adding it runs your own copy, and nothing is downloaded."
        control={
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void installAgent(entry, installKind("detected"))}
          >
            {busy && <AtlasLoader size={11} />}
            Add {item.name}
          </Button>
        }
      />
    );
  } else if (item.catalog?.source === "unavailable") {
    row = (
      <SettingsRow
        title={<span className="text-warning">Can't start</span>}
        description={
          item.catalog.unsupportedReason
            ? `Atlas can't start it: ${item.catalog.unsupportedReason}.`
            : "Atlas can't find anything to run for it."
        }
        control={
          <Button variant="outline" size="sm" onClick={() => void removeAgent(item)}>
            Remove
          </Button>
        }
      />
    );
  } else if (entry?.updateAvailable || phase) {
    row = (
      <SettingsRow
        title="Update available"
        description={
          entry?.installedVersion
            ? `v${entry.installedVersion} is installed and the registry lists v${entry.version}. A reply in progress finishes first, and open chats continue on the new version.`
            : `The registry lists v${entry?.version}. A reply in progress finishes first, and open chats continue on the new version.`
        }
        control={
          phase ? (
            <Button variant="outline" size="sm" disabled>
              <AtlasLoader size={11} />
              {updatePhaseLabel(phase.phase, phase.version)}
            </Button>
          ) : (
            entry && (
              <Button size="sm" onClick={() => updateAgentTo(entry)}>
                <Icon icon={ArrowUpCircle} size="xs" />
                Update to v{entry.version}
              </Button>
            )
          )
        }
      />
    );
  }

  if (!row) return null;
  return <SettingsGroup>{row}</SettingsGroup>;
}

/** How Atlas starts it. */
function RuntimeSection({ item }: { item: AgentItem }) {
  if (item.state === "native") {
    return (
      <SettingsSection title="Runtime">
        <SettingsGroup>
          <SettingsRow
            title="Runs inside Atlas"
            description="In-process, so there is nothing to install, update or remove. It updates with Atlas."
          />
        </SettingsGroup>
      </SettingsSection>
    );
  }
  const catalog = item.catalog;
  const kind = catalog?.distributionKind || item.entry?.distributionKind;
  const launches =
    catalog?.source === "npx"
      ? "Through npx. npm fetches it the first time a chat starts it."
      : catalog?.resolvedPath
        ? undefined
        : "Nothing resolved yet.";
  return (
    <SettingsSection title="Runtime">
      <SettingsGroup>
        <SettingsRow
          title={item.state === "detected" ? "Found at" : "Launches"}
          description={
            catalog?.resolvedPath ? (
              <span className="font-mono break-all">{tildePath(catalog.resolvedPath)}</span>
            ) : (
              launches
            )
          }
        />
        <SettingsRow
          title="Distribution"
          description={distributionText(kind, item)}
          control={
            item.entry?.unverified && kind === "binary" ? (
              <Hint label="This agent's binary download publishes no checksum.">
                <Badge variant="warning" tabIndex={0}>
                  Unverified
                </Badge>
              </Hint>
            ) : undefined
          }
        />
        <SettingsRow title="Agent ID" description={<span className="font-mono">{item.id}</span>} />
      </SettingsGroup>
    </SettingsSection>
  );
}

function distributionText(kind: string | undefined, item: AgentItem): string {
  if (item.state === "detected") return "Your own copy, outside Atlas.";
  if (kind === "binary")
    return "A binary from the ACP registry, downloaded into Atlas's agents folder.";
  if (kind === "npx") return "An npm package from the ACP registry.";
  return "Installed by hand. The ACP registry doesn't list it.";
}

/** What the agent said it can do when it last connected. */
function CapabilitiesSection({ item }: { item: AgentItem }) {
  const c = item.catalog;
  if (!c) return null;
  const caps = [
    c.supportsModels && "Models",
    c.supportsModes && "Modes",
    c.supportsFork && "Fork",
    c.supportsRewind && "Rewind",
    c.supportsLogout && "Sign out",
  ].filter((cap): cap is string => !!cap);
  return (
    <SettingsSection
      title="Capabilities"
      description="What it advertised the last time it connected. An agent that hasn't run yet advertises nothing."
    >
      <SettingsGroup>
        <SettingsRow
          title="Supports"
          description={
            caps.length > 0 ? (
              <span className="flex flex-wrap gap-1 pt-0.5">
                {caps.map((cap) => (
                  <Badge key={cap} variant="outline">
                    {cap}
                  </Badge>
                ))}
              </span>
            ) : (
              "Nothing advertised yet."
            )
          }
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
