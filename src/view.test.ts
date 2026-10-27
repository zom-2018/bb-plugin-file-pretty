import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FORMAT_LIMIT, viewFor } from "./view.ts";

const examples = new URL("../examples/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, examples), "utf8");

// The reason the server gives when the viewer asks for a path that is not in the workspace.
const notFound = "HTTP 404: Path does not exist: /work/thr_x/examples/config.json";

test("a file that cannot be read says why, instead of falling back to BB's preview", () => {
  const view = viewFor({ format: "json", content: null, loadError: notFound, mode: null, indent: 2 });
  assert.deepEqual(view, { kind: "unreadable", message: notFound });
});

test("a broken file shows its error in Raw mode too", () => {
  const view = viewFor({
    format: "json",
    content: read("broken-config.json"),
    loadError: null,
    mode: "raw",
    indent: 2,
  });
  assert.equal(view.kind, "text");
  if (view.kind !== "text") return;
  assert.equal(view.failure?.line, 3);
});

test("a broken file shows its error and the text as written by default", () => {
  const content = read("broken-feed.xml");
  const view = viewFor({ format: "xml", content, loadError: null, mode: null, indent: 2 });
  assert.equal(view.kind, "text");
  if (view.kind !== "text") return;
  assert.equal(view.mode, "formatted");
  assert.equal(view.failure?.line, 5);
  assert.equal(view.text, content);
});

test("a valid file opens formatted by default", () => {
  for (const [name, format] of [
    ["config.json", "json"],
    ["events.jsonl", "jsonl"],
    ["settings.toml", "toml"],
    ["feed.xml", "xml"],
  ] as const) {
    const view = viewFor({ format, content: read(name), loadError: null, mode: null, indent: 2 });
    assert.equal(view.kind, "text", name);
    if (view.kind !== "text") continue;
    assert.equal(view.mode, "formatted", name);
    assert.equal(view.failure, null, name);
    assert.notEqual(view.text, read(name), name);
  }
});

test("JSON Lines opens without the blank line the file has", () => {
  const view = viewFor({ format: "jsonl", content: read("events.jsonl"), loadError: null, mode: null, indent: 2 });
  assert.equal(view.kind, "text");
  if (view.kind !== "text") return;
  assert.doesNotMatch(view.text, /^\s*$/m);
});

test("a file over the size limit opens Raw and is not formatted", () => {
  const content = `{"a":1}${" ".repeat(FORMAT_LIMIT)}`;
  const view = viewFor({ format: "json", content, loadError: null, mode: null, indent: 2 });
  assert.equal(view.kind, "text");
  if (view.kind !== "text") return;
  assert.equal(view.mode, "raw");
  assert.equal(view.text, content);
});

test("the file is still loading until its content arrives", () => {
  const view = viewFor({ format: "json", content: null, loadError: null, mode: null, indent: 2 });
  assert.deepEqual(view, { kind: "loading" });
});
