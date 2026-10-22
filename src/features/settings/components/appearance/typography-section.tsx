/**
 * Four fonts, each with a sample of where it shows: the interface, the
 * composer, code, and the terminal. The composer follows the interface font
 * and the terminal the code font until each is given its own.
 *
 * The samples read the same custom properties the app does
 * (`display-settings.ts`), so each one changes the moment its setting saves,
 * and is the font you will actually get — fallbacks included.
 */

import { Select } from "@/ui/select";
import type { AppSettings } from "../../lib/app-settings";
import { settingMeta } from "../../lib/settings-sections";
import { useScopedSetting } from "../../lib/use-scoped-setting";
import { SettingsGroup, SettingsRow, SettingsSection } from "../layout/settings-layout";
import { FontPicker } from "./font-picker";

/** What each default resolves to, written once for the picker and the sample. */
const SYSTEM_SANS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const DEFAULT_MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';
const UI_FONT = `var(--atlas-ui-font, ${SYSTEM_SANS})`;
const COMPOSER_FONT = `var(--atlas-composer-font, ${UI_FONT})`;
const CODE_FONT = `var(--atlas-code-font, ${DEFAULT_MONO})`;
const TERMINAL_FONT = `var(--atlas-terminal-font, ${CODE_FONT})`;

type FontKey = "uiFontFamily" | "composerFontFamily" | "codeFontFamily" | "terminalFontFamily";
type SizeKey = "editorFontSize" | "terminalFontSize";

export function TypographySection() {
  return (
    <SettingsSection title="Typography">
      <SettingsGroup>
        <SettingsRow
          setting="uiFontFamily"
          control={
            <FontControl setting="uiFontFamily" defaultLabel="System font" fallback={SYSTEM_SANS} />
          }
        >
          <Sample font={UI_FONT}>
            <p className="text-sm text-foreground">Review the open pull requests</p>
            <p className="text-xs text-muted-foreground">
              Three need you · the build on main passed 4 minutes ago
            </p>
          </Sample>
        </SettingsRow>

        <SettingsRow
          setting="composerFontFamily"
          control={
            <FontControl
              setting="composerFontFamily"
              defaultLabel="Same as interface"
              fallback={UI_FONT}
            />
          }
        >
          <Sample font={COMPOSER_FONT}>
            <p className="text-sm text-foreground">
              Fix the flaky test in <span className="text-primary">@auth.test.ts</span> and tell me
              what was racing.
            </p>
          </Sample>
        </SettingsRow>

        <SettingsRow
          setting="codeFontFamily"
          control={
            <FontControl
              setting="codeFontFamily"
              size="editorFontSize"
              defaultLabel="JetBrains Mono"
              fallback={DEFAULT_MONO}
              monospace
            />
          }
        >
          <CodeSample />
        </SettingsRow>

        <SettingsRow
          setting="terminalFontFamily"
          control={
            <FontControl
              setting="terminalFontFamily"
              size="terminalFontSize"
              defaultLabel="Same as code"
              fallback={CODE_FONT}
              monospace
            />
          }
        >
          <TerminalSample />
        </SettingsRow>
      </SettingsGroup>
    </SettingsSection>
  );
}

function FontControl({
  setting,
  size,
  defaultLabel,
  fallback,
  monospace,
}: {
  setting: FontKey;
  size?: SizeKey;
  defaultLabel: string;
  fallback: string;
  monospace?: boolean;
}) {
  const scoped = useScopedSetting(setting);
  return (
    <>
      <FontPicker
        value={scoped.value as string}
        onChange={(next) => scoped.set(next as AppSettings[FontKey])}
        defaultLabel={defaultLabel}
        defaultFamily={fallback}
        monospace={monospace}
        label={settingMeta(setting).title}
      />
      {size && <SizeSelect setting={size} />}
    </>
  );
}

/** Font size in pixels, as a short list rather than a stepper: it sits beside
 *  a font picker, the way a type menu pairs the two. */
function SizeSelect({ setting }: { setting: SizeKey }) {
  const scoped = useScopedSetting(setting);
  const { min = 8, max = 32 } = settingMeta(setting);
  const options = Array.from({ length: max - min + 1 }, (_, i) => {
    const px = String(min + i);
    return { value: px, label: `${px} px` };
  });
  return (
    <Select
      value={String(scoped.value)}
      options={options}
      aria-label={settingMeta(setting).title}
      onValueChange={(next) => scoped.set(Number(next))}
      className="w-20"
    />
  );
}

function Sample({ font, children }: { font: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-0.5 rounded-md border border-border-subtle bg-background px-3 py-2.5"
      style={{ fontFamily: font }}
    >
      {children}
    </div>
  );
}

function CodeSample() {
  const editorFontSize = useScopedSetting("editorFontSize").value as number;
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-md border border-border-subtle"
      style={{
        fontFamily: CODE_FONT,
        fontSize: editorFontSize, // ratchet-allow: the sample IS the editor size setting, previewed at its value
        backgroundColor: "var(--atlas-editor-background)",
        color: "var(--atlas-editor-foreground)",
        lineHeight: 1.6,
      }}
    >
      <pre className="px-3 py-2.5">
        <span style={{ color: "var(--atlas-syntax-keyword)" }}>export function</span>{" "}
        <span style={{ color: "var(--atlas-syntax-function)" }}>formatUser</span>(user: User) {"{"}
        {"\n"}
        {"  "}
        <span style={{ color: "var(--atlas-syntax-keyword)" }}>return</span>{" "}
        <span style={{ color: "var(--atlas-syntax-string)" }}>
          {"`${user.name} <${user.email}>`"}
        </span>
        ;{"\n"}
        {"}"}{" "}
        <span style={{ color: "var(--atlas-syntax-comment)" }}>{"// 0O 1lI {}[] => !== ->"}</span>
      </pre>
    </div>
  );
}

function TerminalSample() {
  const terminalFontSize = useScopedSetting("terminalFontSize").value as number;
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-md border border-border-subtle"
      style={{
        fontFamily: TERMINAL_FONT,
        fontSize: terminalFontSize, // ratchet-allow: the sample IS the terminal size setting, previewed at its value
        backgroundColor: "var(--atlas-terminal-background)",
        color: "var(--atlas-terminal-foreground)",
        lineHeight: 1.5,
      }}
    >
      <pre className="px-3 py-2.5">
        <span style={{ color: "var(--atlas-terminal-ansi-green)" }}>~/atlas</span>{" "}
        <span style={{ color: "var(--atlas-terminal-ansi-blue)" }}>main</span> ❯ bun test
        {"\n"}
        <span style={{ color: "var(--atlas-terminal-ansi-green)" }}>✓</span> 412 passed{"  "}
        <span style={{ color: "var(--atlas-terminal-ansi-yellow)" }}>2 skipped</span>
        {"  "}
        <span style={{ color: "var(--atlas-terminal-ansi-red)" }}>0 failed</span>
      </pre>
    </div>
  );
}
