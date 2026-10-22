import { create } from "zustand";
import { createSelectors } from "@/lib/create-selectors";

/**
 * A yes/no question the app asks before doing something it can't undo:
 * `await confirm({...})` resolves `true` on the confirm button and `false` on
 * Cancel, Escape or a click outside. `ConfirmDialog` renders it, mounted once
 * in App.
 *
 * `window.confirm` is not an option: on Windows (WebView2) it returns `true`
 * without showing anything.
 */
export interface ConfirmPrompt {
  title: string;
  body: string;
  confirmLabel: string;
  /** Red confirm button: the action loses something. */
  destructive?: boolean;
  /**
   * Which `ConfirmDialog` shows it. A question asked from inside another
   * dialog has to render inside that dialog's tree, or a click on it reads as
   * a click outside and closes the dialog that asked. That dialog mounts its
   * own `<ConfirmDialog scope="…" />` and passes the same name here.
   */
  scope?: string;
}

interface ConfirmState {
  pending: (ConfirmPrompt & { resolve: (ok: boolean) => void }) | null;
  actions: {
    ask: (prompt: ConfirmPrompt) => Promise<boolean>;
    settle: (ok: boolean) => void;
  };
}

const useConfirmStoreBase = create<ConfirmState>((set, get) => ({
  pending: null,
  actions: {
    ask: (prompt) =>
      new Promise<boolean>((resolve) => {
        // A newer question supersedes an unanswered one; the old caller hears
        // "no" so its promise never dangles.
        get().pending?.resolve(false);
        set({ pending: { ...prompt, resolve } });
      }),
    settle: (ok) => {
      const pending = get().pending;
      if (!pending) return;
      set({ pending: null });
      pending.resolve(ok);
    },
  },
}));

export const useConfirmStore = createSelectors(useConfirmStoreBase);

export function confirm(prompt: ConfirmPrompt): Promise<boolean> {
  return useConfirmStore.getState().actions.ask(prompt);
}
