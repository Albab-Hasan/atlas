import { useEffect } from "react";
import { toast } from "sonner";
import { Boxes, Download, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Hint } from "@/ui/tooltip";
import { useModelsStore } from "@/features/settings/stores/models-store";
import { useSettingsStore } from "@/features/settings/stores/settings-store";
import { openSettingsSection } from "@/features/settings/lib/open-settings";
import { codeModelToSuggest, downloadPercent } from "@/features/settings/lib/code-model-nudge";
import { COMPOSER_STRIP, COMPOSER_STRIP_ACTION } from "@/features/chat/components/composer-strip";

/**
 * A strip tucked into the top of the composer that offers the code search
 * model while it is missing: one click downloads it, the boxes open
 * Settings → Local Models, the cross hides it for good (per model, in every
 * composer at once). Never downloads on its own: the model is large enough
 * that it should be the user's call. Hidden while agents get no code tools
 * (`agentCodeTools`, ADR-0015): with no `semantic_search` to serve, the model
 * would buy nothing.
 *
 * It was a pill in the composer footer, where it competed with the controls
 * for the turn itself; as a strip it reads as a notice about the composer,
 * like the other bars built on `COMPOSER_STRIP`.
 *
 * Lives in `src/components` because it is a cross-feature widget: the
 * settings feature owns its state, the chat composer renders it.
 */
export function CodeModelNudge() {
  const list = useModelsStore.use.list();
  const downloading = useModelsStore.use.downloading();
  const actions = useModelsStore.use.actions();
  const dismissed = useModelsStore.use.codeNudgeDismissed();
  const codeTools = useSettingsStore((s) => s.settings.agentCodeTools);

  useEffect(() => {
    void actions.init();
  }, [actions]);

  const model = codeTools ? codeModelToSuggest(list, dismissed) : null;
  if (!model) return null;

  const progress = downloading[model.id];
  // "Granite Embedding Small R2" → "Granite": the strip names the model, the
  // tooltip and Local Models carry the full name.
  const shortName = model.name.split(/\s+/)[0] || model.name;
  const label = progress
    ? `Downloading ${downloadPercent(progress)}%`
    : `Download ${shortName} (${model.sizeMb} MB)`;

  const download = () => {
    if (progress) return;
    actions.download(model.id).catch((e) =>
      toast.error(`Download failed: ${e instanceof Error ? e.message : String(e)}`, {
        action: { label: "Local Models", onClick: () => openSettingsSection("models") },
      }),
    );
  };

  return (
    <div role="group" aria-label="Semantic code search" className={COMPOSER_STRIP}>
      <span className="flex min-w-0 items-center gap-1.5">
        <Sparkles size={11} className="shrink-0 text-primary" />
        <span className="min-w-0 truncate">
          {progress ? (
            <span className="text-[var(--muted-foreground)]">
              Downloading{" "}
              <span className="font-semibold text-[var(--foreground)]">{shortName}</span> for Code
              Search
            </span>
          ) : (
            <span className="font-semibold text-[var(--foreground)]">Enable semantic search</span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={label}
          onClick={download}
          disabled={!!progress}
          title={
            progress
              ? undefined
              : `Download ${model.name} (${model.sizeMb} MB) so plain-English questions find code too`
          }
          className={cn(COMPOSER_STRIP_ACTION, "cursor-pointer tabular-nums")}
        >
          {progress ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          {progress ? `${downloadPercent(progress)}%` : `Download · ${model.sizeMb} MB`}
        </button>
        <Hint label="Open Local Models" side="top">
          <button
            type="button"
            aria-label="Open Local Models"
            onClick={() => openSettingsSection("models")}
            className={cn(COMPOSER_STRIP_ACTION, "cursor-pointer")}
          >
            <Boxes size={11} />
          </button>
        </Hint>
        {!progress && (
          <Hint label="Don't suggest this again" side="top">
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => actions.dismissCodeNudge(model.id)}
              className={cn(COMPOSER_STRIP_ACTION, "cursor-pointer")}
            >
              <X size={11} />
            </button>
          </Hint>
        )}
      </span>
    </div>
  );
}
