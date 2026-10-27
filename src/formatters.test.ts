import assert from "node:assert/strict";
import { test } from "node:test";
import { detectFormat, formatContent } from "./formatters.ts";

test("detects formats by file extension", () => {
  assert.equal(detectFormat("/repo/package.json"), "json");
  assert.equal(detectFormat("tsconfig.JSONC"), "json");
  assert.equal(detectFormat("/logs/events.jsonl"), "jsonl");
  assert.equal(detectFormat("config/app.yml"), "yaml");
  assert.equal(detectFormat("Cargo.toml"), "toml");
  assert.equal(detectFormat("pom.xml"), "xml");
  assert.equal(detectFormat("notes/readme.md"), null);
  assert.equal(detectFormat("Makefile"), null);
});

test("formats JSON with the requested indent and keeps comments", () => {
  const result = formatContent("json", '{"b":[1,2],"a":{"c":true}}', 4);
  assert.deepEqual(result, {
    ok: true,
    text: '{\n    "b": [\n        1,\n        2\n    ],\n    "a": {\n        "c": true\n    }\n}',
  });

  const withComment = formatContent("json", '{\n// keep me\n"a":1,}', 2);
  assert.equal(withComment.ok, true);
  assert.match(withComment.ok ? withComment.text : "", /\/\/ keep me/);
});

test("reports the line and column of broken JSON", () => {
  const result = formatContent("json", '{\n  "a": 1\n  "b": 2\n}', 2);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.line, 3);
  assert.equal(result.column, 3);
  assert.match(result.message, /^Invalid JSON: /);
});

test("formats each JSON Lines record on its own, skipping blank lines", () => {
  const result = formatContent("jsonl", '{"a":1}\n\n{"b":[2]}\r\n', 2);
  assert.deepEqual(result, { ok: true, text: '{\n  "a": 1\n}\n{\n  "b": [\n    2\n  ]\n}' });
});

test("reports the failing JSON Lines record by line", () => {
  const result = formatContent("jsonl", '{"a":1}\n{"b":\n', 2);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.line, 2);
});

test("formats YAML and keeps comments and anchors", () => {
  const source = "base: &base\n  name: x   # the name\nchild:\n  <<: *base\n  extra: 1\n";
  const result = formatContent("yaml", source, 4);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.text, /# the name/);
  assert.match(result.text, /&base/);
  assert.match(result.text, /\*base/);
});

test("reports YAML syntax errors with a position", () => {
  const result = formatContent("yaml", "a: 1\nb: [1, 2\n", 2);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(typeof result.line, "number");
  assert.match(result.message, /^Invalid YAML: /);
});

test("formats TOML and reports its error position", () => {
  const ok = formatContent("toml", 'title="x"\n[owner]\nname = "y"\n', 2);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.match(ok.text, /\[owner\]/);

  const bad = formatContent("toml", 'title = "x"\nname = \n', 2);
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.line, 2);
});

test("formats XML with collapsed content and reports broken XML", () => {
  const ok = formatContent("xml", "<root><item>one</item><item>two</item></root>", 2);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.match(ok.text, /<item>one<\/item>/);

  const bad = formatContent("xml", "<root><item></root>", 2);
  assert.equal(bad.ok, false);
});

test("returns empty and whitespace-only content unchanged", () => {
  assert.deepEqual(formatContent("json", "  \n", 2), { ok: true, text: "  \n" });
  assert.deepEqual(formatContent("yaml", "", 2), { ok: true, text: "" });
});
