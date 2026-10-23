// The editor sections that write an agent's own settings through
// `agents_configure`: its name, how it launches, its environment, and which
// of its models the picker shows. T3 Code's provider editor, on Atlas's
// installed-agents map.

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tildePath } from "@/lib/paths";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";
import { IconButton } from "@/ui/icon-button";
import { Input } from "@/ui/input";
import { Hint } from "@/ui/tooltip";
import { useModelFavorites } from "@/features/chat/lib/model-favorites";
import { loadCachedAcpModels } from "@/features/chat/lib/acp-models-cache";
import { useSettingsNav } from "../../stores/settings-nav-store";
import {
  SettingsGroup,
  SettingsNote,
  SettingsRow,
  SettingsSection,
} from "../layout/settings-layout";
import { configureAgent, formatArgs, parseArgs, type AgentItem } from "./agent-install";

/** A text field that saves on Enter or when it loses focus, not per keystroke:
 *  each save rewrites the installed-agents map. Escape reverts. */
function DraftField({
  value,
  onCommit,
  className,
  mono = false,
  ...props
}: {
  value: string;
  onCommit: (next: string) => void;
  className?: string;
  mono?: boolean;
  placeholder?: string;
  "aria-label": string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      size="sm"
      spellCheck={false}
      className={cn(mono && "font-mono", className)}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setDraft(value);
      }}
      {...props}
    />
  );
}

/** The name the agent goes by across Atlas. */
export function GeneralSection({ item }: { item: AgentItem }) {
  const catalog = item.catalog;
  if (!catalog || item.state === "detected") return null;
  return (
    <SettingsSection title="General">
      <SettingsGroup>
        <SettingsRow
          title="Display name"
          description="What the agent picker, chats and tabs call it."
          control={
            <DraftField
              className="w-56"
              value={catalog.displayName ?? ""}
              placeholder={catalog.name}
              aria-label={`${catalog.name}: display name`}
              onCommit={(next) => void configureAgent(item, { displayName: next.trim() || null })}
            />
          }
        />
      </SettingsGroup>
    </SettingsSection>
  );
}

/** How Atlas starts an installed external agent: its command (when it has
 *  one of its own), the arguments after it, and its environment. */
export function LaunchSection({ item }: { item: AgentItem }) {
  const catalog = item.catalog;
  const launch = catalog?.launch;
  if (!catalog || !launch || item.state !== "installed") return null;
  const ownCommand = launch.command !== null;
  return (
    <SettingsSection title="Launch">
      <SettingsGroup>
        {ownCommand ? (
          <SettingsRow
            title="Command"
            description="The executable Atlas starts. It speaks ACP over stdio."
            control={
              <DraftField
                mono
                className="w-72"
                value={launch.command ?? ""}
                aria-label={`${item.name}: command`}
                onCommit={(next) =>
                  next.trim() && void configureAgent(item, { launch: { command: next.trim() } })
                }
              />
            }
          />
        ) : (
          <SettingsRow
            title="Command"
            description={
              catalog.source === "npx"
                ? "From the ACP registry, through npx. npm fetches it the first time a chat starts it."
                : catalog.resolvedPath
                  ? "From the ACP registry."
                  : "From the ACP registry. Nothing resolved yet."
            }
            status={
              catalog.resolvedPath ? (
                <span className="font-mono break-all">{tildePath(catalog.resolvedPath)}</span>
              ) : undefined
            }
          />
        )}
        <SettingsRow
          title="Arguments"
          description={
            ownCommand
              ? "Passed after the command. Quote an argument that has spaces."
              : "Added after the ones the registry gives. Quote an argument that has spaces."
          }
          control={
            <DraftField
              mono
              className="w-72"
              value={formatArgs(launch.args)}
              placeholder="None"
              aria-label={`${item.name}: arguments`}
              onCommit={(next) => void configureAgent(item, { launch: { args: parseArgs(next) } })}
            />
          }
        />
      </SettingsGroup>
    </SettingsSection>
  );
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Names that look like a credential, which belong in the shell profile. */
const SECRET_NAME = /(KEY|TOKEN|SECRET|PASSWORD)$/i;

/** Extra variables for the agent's process, over what Atlas inherits. */
export function EnvironmentSection({ item }: { item: AgentItem }) {
  const launch = item.catalog?.launch;
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  if (!launch || item.state !== "installed") return null;
  const env = launch.env;
  const names = Object.keys(env).sort();
  const trimmed = name.trim();
  const invalid = trimmed !== "" && !ENV_NAME.test(trimmed);
  const secrets = names.filter((n) => SECRET_NAME.test(n));

  const write = (next: Record<string, string>) => configureAgent(item, { launch: { env: next } });
  const add = async () => {
    if (!trimmed || invalid) return;
    if (await write({ ...env, [trimmed]: value })) {
      setName("");
      setValue("");
    }
  };
  const remove = (key: string) => {
    const next = { ...env };
    delete next[key];
    void write(next);
  };

  return (
    <SettingsSection
      title="Environment"
      description="Set for this agent's process only, on top of the environment Atlas starts with. Saved in Atlas's agent settings."
    >
      <SettingsGroup>
        {names.map((key) => (
          <SettingsRow
            key={key}
            title={<span className="font-mono">{key}</span>}
            control={
              <>
                <DraftField
                  mono
                  className="w-56"
                  value={env[key] ?? ""}
                  aria-label={`${key} value`}
                  onCommit={(next) => void write({ ...env, [key]: next })}
                />
                <Hint label={`Remove ${key}`}>
                  <IconButton
                    icon={X}
                    size="sm"
                    label={`Remove ${key}`}
                    onClick={() => remove(key)}
                  />
                </Hint>
              </>
            }
          />
        ))}
        <form
          className="flex flex-wrap items-center gap-2 px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <Input
            size="sm"
            spellCheck={false}
            className="w-44 font-mono"
            placeholder="NAME"
            aria-label="New variable name"
            aria-invalid={invalid || undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            size="sm"
            spellCheck={false}
            className="min-w-0 flex-1 font-mono"
            placeholder="value"
            aria-label="New variable value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button type="submit" variant="outline" size="sm" disabled={!trimmed || invalid}>
            <Icon icon={Plus} size="xs" />
            Add
          </Button>
          {invalid && (
            <p className="w-full text-2xs text-warning">
              Letters, digits and underscores, not starting with a digit.
            </p>
          )}
        </form>
      </SettingsGroup>
      {secrets.length > 0 && (
        <p className="caption px-1">
          {secrets.join(", ")} {secrets.length === 1 ? "looks" : "look"} like a key. Keys are better
          kept in{" "}
          <button
            type="button"
            className="underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => useSettingsNav.getState().goTo("agents", "provider-keys")}
          >
            Provider keys
          </button>
          , in your shell profile, where your other tools see them too.
        </p>
      )}
    </SettingsSection>
  );
}

/** Every model the agent has offered, to star or hide from the picker. An
 *  agent advertises its models in a session, so the list is the last one it
 *  gave; before its first chat, only what is starred or hidden is known. */
export function ModelsSection({ item }: { item: AgentItem }) {
  const catalog = item.catalog;
  const { favorites, toggle } = useModelFavorites();
  const hidden = useMemo(() => new Set(catalog?.hiddenModels ?? []), [catalog?.hiddenModels]);
  const known = useMemo(
    () => loadCachedAcpModels(item.agentType)?.availableModels ?? [],
    [item.agentType],
  );
  if (!catalog || !(item.state === "native" || catalog.supportsModels)) return null;

  const prefix = `${item.agentType}:`;
  const starred = [...favorites]
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length));
  // Known models first, in the agent's order, then any starred or hidden id
  // the last list no longer has.
  const rows = [
    ...known.map((m) => ({ id: m.id, name: m.name })),
    ...[...new Set([...starred, ...hidden])]
      .filter((id) => !known.some((m) => m.id === id))
      .map((id) => ({ id, name: null as string | null })),
  ];
  const setHidden = (id: string, hide: boolean) => {
    const next = hide ? [...hidden, id] : [...hidden].filter((h) => h !== id);
    void configureAgent(item, { hiddenModels: next });
  };
  const shownCount = rows.filter((r) => !hidden.has(r.id)).length;

  return (
    <SettingsSection
      title="Models"
      description={
        rows.length > 0
          ? `${shownCount} of ${rows.length} in the model picker. Starred ones open it; hidden ones stay out unless starred.`
          : undefined
      }
    >
      <SettingsGroup>
        {rows.length === 0 ? (
          <SettingsNote>
            Its models show up here after its first chat, to star or hide from the picker.
          </SettingsNote>
        ) : (
          rows.map((row) => {
            const isStarred = favorites.has(`${prefix}${row.id}`);
            const isHidden = hidden.has(row.id);
            return (
              <SettingsRow
                key={row.id}
                title={
                  <span className={cn(isHidden && "text-muted-foreground")}>
                    {row.name ?? <span className="font-mono">{row.id}</span>}
                  </span>
                }
                description={
                  row.name && row.name !== row.id ? (
                    <span className="font-mono">{row.id}</span>
                  ) : row.name === null ? (
                    "Not in the last list it gave."
                  ) : undefined
                }
                control={
                  <>
                    <Hint label={isStarred ? "Unstar" : "Star"}>
                      <IconButton
                        icon={Star}
                        size="sm"
                        label={`${isStarred ? "Unstar" : "Star"} ${row.id}`}
                        aria-pressed={isStarred}
                        active={isStarred}
                        onClick={() => toggle(item.agentType, row.id)}
                      />
                    </Hint>
                    <Hint label={isHidden ? "Show in the picker" : "Hide from the picker"}>
                      <IconButton
                        icon={isHidden ? EyeOff : Eye}
                        size="sm"
                        label={`${isHidden ? "Show" : "Hide"} ${row.id}`}
                        aria-pressed={isHidden}
                        onClick={() => setHidden(row.id, !isHidden)}
                      />
                    </Hint>
                  </>
                }
              />
            );
          })
        )}
      </SettingsGroup>
    </SettingsSection>
  );
}
