import { applyEdits, format as formatJsonc, parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";
import { parseAllDocuments } from "yaml";
import { parse as parseToml, stringify as stringifyToml, TomlError } from "smol-toml";
import { XMLValidator } from "fast-xml-parser";
import formatXml from "xml-formatter";

export type FormatKind = "json" | "jsonl" | "yaml" | "toml" | "xml";

export type FormatResult =
  | { ok: true; text: string }
  | { ok: false; message: string; line: number | null; column: number | null };

export const FORMAT_NAMES: Record<FormatKind, string> = {
  json: "JSON",
  jsonl: "JSON Lines",
  yaml: "YAML",
  toml: "TOML",
  xml: "XML",
};

/** Kinds where the indent setting applies. TOML has no indentation to choose. */
export const INDENTABLE: ReadonlySet<FormatKind> = new Set(["json", "jsonl", "yaml", "xml"]);

const KIND_BY_EXTENSION: Record<string, FormatKind> = {
  json: "json",
  jsonc: "json",
  jsonl: "jsonl",
  ndjson: "jsonl",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  plist: "xml",
  csproj: "xml",
  xsd: "xml",
};

/** The format for a file name, by its extension. Null means "not handled". */
export function detectFormat(path: string): FormatKind | null {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return KIND_BY_EXTENSION[extension] ?? null;
}

/** Format `content` as `kind`. Never throws: a failure comes back as `{ ok: false }`. */
export function formatContent(kind: FormatKind, content: string, indent: number): FormatResult {
  if (content.trim() === "") return { ok: true, text: content };
  try {
    switch (kind) {
      case "json":
        return formatJson(content, indent);
      case "jsonl":
        return formatJsonl(content, indent);
      case "yaml":
        return formatYaml(content, indent);
      case "toml":
        return formatToml(content);
      case "xml":
        return formatXmlText(content, indent);
    }
  } catch (cause) {
    return { ok: false, message: firstLine(messageOf(cause)), line: null, column: null };
  }
}

function formatJson(content: string, indent: number): FormatResult {
  // JSONC: comments and trailing commas are accepted, as editors accept them in tsconfig.json.
  const errors: ParseError[] = [];
  parseJsonc(content, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const [first] = errors;
    return failureAt(`Invalid JSON: ${printParseErrorCode(first.error)}`, content, first.offset);
  }
  const edits = formatJsonc(content, undefined, { tabSize: indent, insertSpaces: true });
  return { ok: true, text: applyEdits(content, edits) };
}

function formatJsonl(content: string, indent: number): FormatResult {
  const records: string[] = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "") continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (cause) {
      return {
        ok: false,
        message: `Invalid JSON on this line: ${firstLine(messageOf(cause))}`,
        line: index + 1,
        column: null,
      };
    }
    records.push(JSON.stringify(value, null, indent));
  }
  return { ok: true, text: records.join("\n") };
}

function formatYaml(content: string, indent: number): FormatResult {
  const documents = parseAllDocuments(content);
  for (const document of documents) {
    const [error] = document.errors;
    if (error) {
      const position = error.linePos?.[0];
      return {
        ok: false,
        message: `Invalid YAML: ${firstLine(error.message)}`,
        line: position?.line ?? null,
        column: position?.col ?? null,
      };
    }
  }
  // lineWidth 0 keeps long scalars on one line instead of folding them.
  const text = documents.map((document) => document.toString({ indent, lineWidth: 0 })).join("---\n");
  return { ok: true, text };
}

function formatToml(content: string): FormatResult {
  try {
    // smol-toml re-stringifies the parsed data, so comments are not kept in this view.
    return { ok: true, text: stringifyToml(parseToml(content)) };
  } catch (cause) {
    if (cause instanceof TomlError) {
      return { ok: false, message: `Invalid TOML: ${firstLine(cause.message)}`, line: cause.line, column: cause.column };
    }
    throw cause;
  }
}

function formatXmlText(content: string, indent: number): FormatResult {
  // xml-formatter re-indents mismatched tags without complaint, so the tag structure is checked first.
  const check = XMLValidator.validate(content);
  if (check !== true) {
    return { ok: false, message: `Invalid XML: ${firstLine(check.err.msg)}`, line: check.err.line, column: check.err.col };
  }
  const text = formatXml(content, {
    indentation: " ".repeat(indent),
    collapseContent: true,
    lineSeparator: "\n",
    throwOnFailure: true,
  });
  return { ok: true, text };
}

function failureAt(message: string, content: string, offset: number): FormatResult {
  const before = content.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");
  return { ok: false, message, line, column };
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function firstLine(text: string): string {
  return text.split("\n")[0].trim();
}
