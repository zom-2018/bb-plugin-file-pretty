import { formatContent } from "./formatters.ts";
import type { FormatKind, FormatResult } from "./formatters.ts";

/** Characters above which a file opens in Raw; formatting it is one click away. */
export const FORMAT_LIMIT = 5_000_000;

export type ViewMode = "formatted" | "raw";
export type IndentSize = 2 | 4;
export type Failure = Extract<FormatResult, { ok: false }>;

export type View =
  | { kind: "loading" }
  | { kind: "unreadable"; message: string }
  | { kind: "text"; mode: ViewMode; text: string; formatted: boolean; failure: Failure | null };

export interface ViewInput {
  format: FormatKind;
  content: string | null;
  loadError: string | null;
  mode: ViewMode | null;
  indent: IndentSize;
}

/** What the file opener shows for the state it is in. */
export function viewFor({ format, content, loadError, mode, indent }: ViewInput): View {
  if (loadError !== null) return { kind: "unreadable", message: loadError };
  if (content === null) return { kind: "loading" };
  const shownMode = mode ?? (content.length > FORMAT_LIMIT ? "raw" : "formatted");
  // A file over the limit is formatted only when the user asks for Formatted.
  if (shownMode === "raw" && content.length > FORMAT_LIMIT) {
    return { kind: "text", mode: shownMode, text: content, formatted: false, failure: null };
  }
  const result = formatContent(format, content, indent);
  // A file that does not parse keeps its error in both views, with the text as written.
  if (!result.ok) return { kind: "text", mode: shownMode, text: content, formatted: false, failure: result };
  if (shownMode === "raw") return { kind: "text", mode: shownMode, text: content, formatted: false, failure: null };
  return { kind: "text", mode: shownMode, text: result.text, formatted: true, failure: null };
}
