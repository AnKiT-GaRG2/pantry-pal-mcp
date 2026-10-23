import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.PANTRY_DIR = mkdtempSync(path.join(tmpdir(), "pantry-say-"));
delete process.env.BEDROCK_MODEL_ID;
const { say } = await import("./say.js");
const { recentActions } = await import("./activity.js");

let n = 0;
const home = () => `say${++n}`;

test("a spoken purchase reaches the pantry through the MCP server", async () => {
  const h = home();
  const r = await say(h, "I bought six eggs that expire tomorrow");
  assert.equal(r.understood, true);
  assert.equal(r.tool, "add_pantry_item");
  assert.equal(r.reply, "Added 6 eggs to your pantry. They expire tomorrow.");
  assert.equal((await say(h, "what is in my pantry")).reply, "You have 6 eggs.");
});

test("an unrecognised sentence gets help and changes nothing", async () => {
  const h = home();
  const r = await say(h, "tell me a joke");
  assert.equal(r.understood, false);
  assert.match(r.reply, /^Sorry, I didn't catch that/);
  assert.equal((await say(h, "what is in my pantry")).reply, "Your pantry is empty.");
  assert.deepEqual(recentActions(h).map((a) => a.tool), ["pantry_summary"]);
});

test("empty input is not understood", async () => assert.equal((await say(home(), "   ")).understood, false));

test("the spoken sentence is attached to the recorded action", async () => {
  const h = home();
  await say(h, "I bought two liters of milk");
  assert.equal(recentActions(h)[0].heard, "I bought two liters of milk");
  assert.equal(recentActions(h)[0].tool, "add_pantry_item");
});

test("full demo conversation", async () => {
  const h = home();
  const said = async (t: string) => (await say(h, t)).reply;
  await said("I bought six eggs that expire in ten days");
  await said("I bought some spinach that expires tomorrow");
  assert.equal(await said("What should I eat first?"), "spinach expires tomorrow.");
  assert.equal(await said("I used two eggs"), "Okay, used 2 eggs. 4 left.");
  assert.match(await said("I cooked the spinach"), /out of spinach, so I added it to your shopping list/);
  assert.equal(await said("What's on my shopping list?"), "Your shopping list has spinach.");
  assert.equal(await said("I bought yogurt that expired yesterday"), "Added 1 yogurt to your pantry. It already expired.");
  assert.equal(await said("Throw out what's expired"), "Threw out 1 yogurt.");
  assert.match(await said("How much food have I wasted?"), /wasted 1\. That's 75 percent/);
  assert.match(await said("What can I make for dinner?"), /^For dinner/);
  assert.equal(await said("add bread to my shopping list"), "Added bread to your shopping list.");
});

test("bad date gets a spoken explanation", async () => {
  assert.match((await say(home(), "I bought milk that expires someday")).reply, /didn't understand the date "someday"/);
});

test("households stay separate", async () => {
  const a = home(), b = home();
  await say(a, "I bought three apples");
  assert.equal((await say(b, "what is in my pantry")).reply, "Your pantry is empty.");
});

test("a meal plan request works end to end", async () => {
  const h = home();
  await say(h, "I bought rice");
  assert.match((await say(h, "plan dinners for two days")).reply, /^Day 1: .*Day 2:/);
});
