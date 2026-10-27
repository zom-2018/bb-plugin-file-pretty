import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { detectFormat, formatContent } from "./formatters.ts";
import type { FormatKind, FormatResult } from "./formatters.ts";

// The sample files in examples/ are for trying the plugin by hand; these checks keep them in step with the code.
const examples = new URL("../examples/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, examples), "utf8");
const textOf = (result: FormatResult) => (result.ok ? result.text : "");

test("every valid example is detected and formats", () => {
  const samples: [string, FormatKind][] = [
    ["config.json", "json"],
    ["events.jsonl", "jsonl"],
    ["deploy.yaml", "yaml"],
    ["settings.toml", "toml"],
    ["feed.xml", "xml"],
  ];
  for (const [name, kind] of samples) {
    assert.equal(detectFormat(name), kind, name);
    assert.equal(formatContent(kind, read(name), 2).ok, true, name);
  }
});

test("examples show the behavior the README describes", () => {
  const json = textOf(formatContent("json", read("config.json"), 2));
  assert.match(json, /\/\/ feature flags are read once at startup/);

  const jsonl = textOf(formatContent("jsonl", read("events.jsonl"), 2));
  assert.equal(jsonl.match(/^\{$/gm)?.length, 3);

  const yaml = textOf(formatContent("yaml", read("deploy.yaml"), 2));
  assert.match(yaml, /# two pods for failover/);
  assert.match(yaml, /<<: \*defaults/);

  const toml = textOf(formatContent("toml", read("settings.toml"), 2));
  assert.match(toml, /\[database\.pool\]/);
  assert.doesNotMatch(toml, /Application settings/);

  const xml = textOf(formatContent("xml", read("feed.xml"), 2));
  assert.match(xml, /\n {2}<title>Demo feed<\/title>/);
});

test("broken examples report the line where they fail", () => {
  const json = formatContent("json", read("broken-config.json"), 2);
  assert.equal(json.ok, false);
  if (json.ok) return;
  assert.equal(json.line, 3);

  const xml = formatContent("xml", read("broken-feed.xml"), 2);
  assert.equal(xml.ok, false);
  if (xml.ok) return;
  assert.equal(xml.line, 5);
});
