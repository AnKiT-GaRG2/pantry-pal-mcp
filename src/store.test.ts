import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "pantry-store-"));
process.env.PANTRY_DIR = dir;
const { withState } = await import("./store.js");

test("new household starts empty", async () => {
  const s = await withState("fresh", (st) => st);
  assert.deepEqual(s, { pantry: [], shopping: [], stats: { used: 0, wasted: 0 } });
});

test("reading alone does not create a file", async () => {
  await withState("readonly", (st) => st.pantry.length);
  assert.equal(readdirSync(dir).includes("readonly.json"), false);
});

test("changes are persisted to disk", async () => {
  await withState("persist", (st) => void st.shopping.push("milk"));
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir, "persist.json"), "utf8")).shopping, ["milk"]);
  assert.deepEqual((await withState("persist", (st) => st.shopping)), ["milk"]);
});

test("households are isolated", async () => {
  await withState("home-a", (st) => void st.shopping.push("eggs"));
  assert.deepEqual(await withState("home-b", (st) => st.shopping), []);
});

test("path traversal in the household id is neutralised", async () => {
  await withState("../../evil", (st) => void st.shopping.push("x"));
  const files = readdirSync(dir);
  assert.ok(files.includes("______evil.json"), files.join(","));
});

test("long household ids are truncated to 64 characters", async () => {
  await withState("a".repeat(200), (st) => void st.shopping.push("x"));
  assert.ok(readdirSync(dir).includes("a".repeat(64) + ".json"));
});

test("empty household id falls back to default", async () => {
  await withState("", (st) => void st.shopping.push("x"));
  assert.ok(readdirSync(dir).includes("default.json"));
});

test("concurrent writes are serialised", async () => {
  await Promise.all(Array.from({ length: 50 }, () => withState("race", (st) => void (st.stats.used += 1))));
  assert.equal(await withState("race", (st) => st.stats.used), 50);
});

test("a throwing callback does not break later calls", async () => {
  await assert.rejects(withState("boom", () => { throw new Error("nope"); }), /nope/);
  assert.equal(await withState("boom", () => "ok"), "ok");
});

test("a failed callback does not persist partial changes", async () => {
  await assert.rejects(withState("partial", (st) => { st.shopping.push("x"); throw new Error("fail"); }));
  assert.deepEqual(await withState("partial", (st) => st.shopping), []);
});

test("corrupt file is treated as empty", async () => {
  writeFileSync(path.join(dir, "corrupt.json"), "{not json");
  assert.deepEqual(await withState("corrupt", (st) => st.pantry), []);
});

test("partial file is merged with defaults", async () => {
  writeFileSync(path.join(dir, "partialfile.json"), JSON.stringify({ pantry: [{ name: "egg", quantity: 1, unit: "count" }] }));
  const s = await withState("partialfile", (st) => st);
  assert.equal(s.pantry.length, 1);
  assert.deepEqual(s.shopping, []);
  assert.deepEqual(s.stats, { used: 0, wasted: 0 });
});

test("return value of the callback is passed through", async () => {
  assert.equal(await withState("ret", async () => 42), 42);
});
