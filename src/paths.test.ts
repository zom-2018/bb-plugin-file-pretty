import assert from "node:assert/strict";
import { test } from "node:test";
import { isAbsolutePath, joinPath, relativeSegments } from "./paths.ts";

test("splits relative paths into segments", () => {
  assert.deepEqual(relativeSegments("docs/./a.json"), ["docs", "a.json"]);
  assert.deepEqual(relativeSegments("a\\b.yaml"), ["a", "b.yaml"]);
});

test("refuses absolute paths and traversal", () => {
  assert.throws(() => relativeSegments("/etc/passwd"), /must be relative/);
  assert.throws(() => relativeSegments("C:\\x"), /must be relative/);
  assert.throws(() => relativeSegments("a/../../secret"), /leaves its root/);
  assert.throws(() => relativeSegments("..\\secret"), /leaves its root/);
});

test("joins under a POSIX or Windows root", () => {
  assert.equal(joinPath("/home/me/repo/", ["a", "b.json"]), "/home/me/repo/a/b.json");
  assert.equal(joinPath("/", ["a"]), "/a");
  assert.equal(joinPath("C:\\work\\repo", ["a", "b.json"]), "C:\\work\\repo\\a\\b.json");
});

test("detects absolute paths", () => {
  assert.equal(isAbsolutePath("/var/log"), true);
  assert.equal(isAbsolutePath("D:/data"), true);
  assert.equal(isAbsolutePath("data/x.json"), false);
});
