// bb-plugin-pretty — a BB plugin frontend entry.
//
// Opens JSON, JSON Lines, YAML, TOML, and XML files in a formatted view. BB's
// built-in editor also opens json, yaml, toml, and xml. BB registers openers in
// plugin-id order, and this plugin's id (file-pretty) sorts before
// monaco-editor, so Pretty is the first opener. Compiled by `bb plugin build` into
// dist/app.js + dist/app.css. React and @get-bb/plugin-sdk/app are provided by
// the BB app at load time, so this file must be loaded by BB, not imported.
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  definePluginApp,
  experimental_copyToClipboard,
  experimental_SourceCode as SourceCode,
  useRpc,
} from "@get-bb/plugin-sdk/app";
import type { PluginFileOpenerProps } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./server";
import { detectFormat, FORMAT_NAMES, INDENTABLE } from "./src/formatters";
import type { FormatKind } from "./src/formatters";
import { viewFor } from "./src/view";
import type { Failure, IndentSize, ViewMode } from "./src/view";

const EXTENSIONS = ["json", "jsonc", "jsonl", "ndjson", "yaml", "yml", "toml", "xml", "plist", "csproj", "xsd"];

function PrettyFileOpener(props: PluginFileOpenerProps) {
  const format = detectFormat(props.path);
  // Files the registration matched but this plugin cannot format fall back to BB's preview.
  if (format === null) return <props.Original />;
  return <FormatView {...props} format={format} />;
}

function FormatView({
  format,
  path,
  source,
  experimental_lineRange: lineRange,
}: PluginFileOpenerProps & { format: FormatKind }) {
  const rpc = useRpc<typeof rpcContract>();
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode | null>(null);
  const [indent, setIndent] = useState<IndentSize>(2);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const { kind: sourceKind, threadId, environmentId } = source;
  const hostId = source.experimental_hostId ?? null;

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setLoadError(null);
    rpc.call("readFile", { kind: sourceKind, path, threadId, environmentId, hostId }).then(
      (result) => {
        if (!cancelled) setContent(result.content);
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(messageOf(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [rpc, sourceKind, path, threadId, environmentId, hostId]);

  // Computed before the early returns below so the hooks run in the same order every render.
  const view = useMemo(
    () => viewFor({ format, content, loadError, mode, indent }),
    [format, content, loadError, mode, indent],
  );

  if (view.kind === "loading") return <Notice>Loading…</Notice>;
  if (view.kind === "unreadable") return <Unreadable path={path} message={view.message} />;

  // Line numbers change when the text is reformatted, so a target line only applies to the raw text.
  const highlightedLines =
    !view.formatted && lineRange ? { start: lineRange.startLineNumber, end: lineRange.endLineNumber } : null;

  const copy = () => {
    experimental_copyToClipboard({ text: view.text }).then(
      (ok) => setCopyState(ok ? "copied" : "failed"),
      () => setCopyState("failed"),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-sm">
        <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-md border border-border">
          <ToggleButton active={view.mode === "formatted"} onClick={() => setMode("formatted")}>
            Formatted
          </ToggleButton>
          <ToggleButton active={view.mode === "raw"} onClick={() => setMode("raw")}>
            Raw
          </ToggleButton>
        </div>
        {INDENTABLE.has(format) && view.mode === "formatted" && (
          <select
            aria-label="Indent"
            value={indent}
            onChange={(event) => setIndent(Number(event.target.value) === 4 ? 4 : 2)}
            className="rounded-md border border-border bg-transparent px-2 py-1"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        )}
        <span className="text-muted-foreground">{FORMAT_NAMES[format]}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded-md border border-border px-2 py-1 hover:bg-muted"
        >
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
        </button>
      </div>
      {view.failure && <ErrorBanner failure={view.failure} />}
      <div className="min-h-0 flex-1 overflow-auto">
        <SourceCode content={view.text} path={path} overflow="scroll" highlightedLines={highlightedLines} />
      </div>
    </div>
  );
}

function Unreadable({ path, message }: { path: string; message: string }) {
  return (
    <div role="alert" className="p-4 text-sm">
      <div className="font-medium">Could not open {path}.</div>
      <div className="text-muted-foreground">{message}</div>
    </div>
  );
}

function ErrorBanner({ failure }: { failure: Failure }) {
  const where = failure.line === null ? "" : ` (line ${failure.line}${failure.column === null ? "" : `, column ${failure.column}`})`;
  return (
    <div role="alert" className="border-b border-border bg-destructive/10 px-3 py-2 text-sm">
      Showing the file as written. {failure.message}
      {where}
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-1 ${active ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
    >
      {children}
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="p-4 text-sm text-muted-foreground">{children}</div>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default definePluginApp((app) => {
  app.slots.fileOpener({
    id: "pretty",
    title: "Pretty",
    extensions: EXTENSIONS,
    component: PrettyFileOpener,
  });
});
