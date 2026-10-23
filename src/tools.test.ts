import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

process.env.PANTRY_DIR = mkdtempSync(path.join(tmpdir(), "pantry-tools-"));
delete process.env.BEDROCK_MODEL_ID;
const { createServer } = await import("./mcp.js");

let n = 0;
/** A client connected to a fresh household, with a helper that returns the spoken text. */
async function session(household = `h${++n}`) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(household).connect(b);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(a);
  const say = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    return (res.content as { text: string }[])[0].text;
  };
  const rejects = async (name: string, args: Record<string, unknown>) => {
    try {
      const res = await client.callTool({ name, arguments: args });
      return res.isError === true;
    } catch {
      return true;
    }
  };
  return { client, say, rejects };
}

const EXPIRED = "2020-01-01";

test("server lists all nine tools", async () => {
  const { client } = await session();
  const names = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["add_pantry_item", "check_expiring", "discard_expired", "manage_shopping_list", "pantry_summary", "plan_meals", "suggest_recipe", "use_pantry_item", "waste_report"]);
});

for (const name of ["check_expiring", "waste_report", "suggest_recipe", "plan_meals", "pantry_summary"]) {
  test(`${name} is annotated read-only`, async () => {
    const { client } = await session();
    assert.equal((await client.listTools()).tools.find((t) => t.name === name)?.annotations?.readOnlyHint, true);
  });
}
test("discard_expired is annotated destructive", async () => {
  const { client } = await session();
  assert.equal((await client.listTools()).tools.find((t) => t.name === "discard_expired")?.annotations?.destructiveHint, true);
});
test("every tool has a description", async () => {
  const { client } = await session();
  for (const t of (await client.listTools()).tools) assert.ok(t.description && t.description.length > 10, t.name);
});

test("add: plural with expiry", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "eggs", quantity: 6, expires: "tomorrow" }), "Added 6 eggs to your pantry. They expire tomorrow.");
});
test("add: singular with expiry", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "an egg", expires: "tomorrow" }), "Added 1 egg to your pantry. It expires tomorrow.");
});
test("add: expires today", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "yogurt", expires: "today" }), "Added 1 yogurt to your pantry. It expires today.");
});
test("add: expiry in several days", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "apples", quantity: 4, expires: "in 5 days" }), "Added 4 apples to your pantry. They expire in 5 days.");
});
test("add: already expired date", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "milk", unit: "liters", expires: EXPIRED }), "Added 1 liters milk to your pantry. It already expired.");
});
test("add: estimates shelf life when no date given", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "milk", quantity: 2, unit: "liters" }), "Added 2 liters milk to your pantry. I'll assume it expires in 7 days.");
});
test("add: estimate uses plural pronoun for counted items", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "bananas", quantity: 3 }), "Added 3 bananas to your pantry. I'll assume they expire in 5 days.");
});
test("add: unknown food gets no expiry sentence", async () => {
  const { say } = await session();
  assert.equal(await say("add_pantry_item", { name: "dragonfruit" }), "Added 1 dragonfruit to your pantry.");
});
test("add: unparseable date is reported and nothing is added", async () => {
  const { say } = await session();
  assert.match(await say("add_pantry_item", { name: "eggs", expires: "someday" }), /^Sorry, I didn't understand the date "someday"/);
  assert.equal(await say("pantry_summary"), "Your pantry is empty.");
});
test("add: same item merges quantities across spellings", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 6 });
  await say("add_pantry_item", { name: "an egg", quantity: 2 });
  assert.equal(await say("pantry_summary"), "You have 8 eggs.");
});
test("add: merge keeps the earlier date (earlier first)", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "egg", expires: "tomorrow" });
  await say("add_pantry_item", { name: "egg", expires: "in 5 days" });
  assert.equal(await say("check_expiring", { days: 1 }), "eggs expire tomorrow.");
});
test("add: merge keeps the earlier date (later first)", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "egg", expires: "in 5 days" });
  await say("add_pantry_item", { name: "egg", expires: "tomorrow" });
  assert.equal(await say("check_expiring", { days: 1 }), "eggs expire tomorrow.");
});
test("add: different units stay separate", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "milk", unit: "liters", quantity: 2 });
  await say("add_pantry_item", { name: "milk", unit: "cartons", quantity: 1 });
  assert.equal(await say("pantry_summary"), "You have 2 liters milk, 1 cartons milk.");
});
test("add: removes the item from the shopping list", async () => {
  const { say } = await session();
  await say("manage_shopping_list", { action: "add", item: "milk" });
  await say("add_pantry_item", { name: "milk" });
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list is empty.");
});
test("add: zero quantity is rejected", async () => assert.ok(await (await session()).rejects("add_pantry_item", { name: "egg", quantity: 0 })));
test("add: negative quantity is rejected", async () => assert.ok(await (await session()).rejects("add_pantry_item", { name: "egg", quantity: -2 })));
test("add: empty name is rejected", async () => assert.ok(await (await session()).rejects("add_pantry_item", { name: "" })));

test("use: partial amount", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 6 });
  assert.equal(await say("use_pantry_item", { name: "eggs", quantity: 2 }), "Okay, used 2 eggs. 4 left.");
});
test("use: defaults to one", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 3 });
  assert.equal(await say("use_pantry_item", { name: "egg" }), "Okay, used 1 egg. 2 left.");
});
test("use: more than available uses what is left and adds to shopping list", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 2 });
  assert.equal(await say("use_pantry_item", { name: "eggs", quantity: 5 }), "Okay, used 2 eggs. You're out of egg, so I added it to your shopping list.");
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list has egg.");
  assert.equal(await say("pantry_summary"), "Your pantry is empty.");
});
test("use: unknown item", async () => {
  const { say } = await session();
  assert.equal(await say("use_pantry_item", { name: "kale" }), "You don't have any kale in the pantry.");
});
test("use: running out twice does not duplicate the shopping entry", async () => {
  const { say } = await session();
  for (let i = 0; i < 2; i++) {
    await say("add_pantry_item", { name: "egg" });
    await say("use_pantry_item", { name: "egg" });
  }
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list has egg.");
});
test("use: zero quantity is rejected", async () => assert.ok(await (await session()).rejects("use_pantry_item", { name: "egg", quantity: 0 })));
test("use: fractional quantity of weighed food", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice", quantity: 1.5, unit: "kg" });
  assert.equal(await say("use_pantry_item", { name: "rice", quantity: 0.5 }), "Okay, used 0.5 rice. 1 left.");
});

test("check_expiring: empty pantry", async () => assert.equal(await (await session()).say("check_expiring"), "Nothing expires in the next 3 days."));
test("check_expiring: soonest first", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "milk", unit: "liters", expires: "in 3 days" });
  await say("add_pantry_item", { name: "spinach", expires: "tomorrow" });
  assert.equal(await say("check_expiring"), "spinach expires tomorrow. milk expires in 3 days.");
});
test("check_expiring: excludes items beyond the window", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice", expires: "in 20 days" });
  assert.equal(await say("check_expiring", { days: 5 }), "Nothing expires in the next 5 days.");
});
test("check_expiring: includes expired items", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "milk", unit: "liters", expires: EXPIRED });
  assert.equal(await say("check_expiring"), "milk already expired.");
});
test("check_expiring: days=0 means today and earlier only", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "yogurt", expires: "today" });
  await say("add_pantry_item", { name: "bread", expires: "tomorrow" });
  assert.equal(await say("check_expiring", { days: 0 }), "yogurt expires today.");
});
test("check_expiring: ignores items with no expiry", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "dragonfruit" });
  assert.equal(await say("check_expiring", { days: 30 }), "Nothing expires in the next 30 days.");
});
test("check_expiring: days above 30 rejected", async () => assert.ok(await (await session()).rejects("check_expiring", { days: 31 })));
test("check_expiring: negative days rejected", async () => assert.ok(await (await session()).rejects("check_expiring", { days: -1 })));
test("check_expiring: fractional days rejected", async () => assert.ok(await (await session()).rejects("check_expiring", { days: 1.5 })));

test("discard: nothing expired", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice" });
  assert.equal(await say("discard_expired"), "Nothing in your pantry has expired.");
});
test("discard: removes expired and records waste", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "milk", unit: "liters", quantity: 2, expires: EXPIRED });
  assert.equal(await say("discard_expired"), "Threw out 2 liters milk.");
  assert.equal(await say("pantry_summary"), "Your pantry is empty.");
  assert.match(await say("waste_report"), /wasted 2\./);
});
test("discard: keeps fresh and undated items", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "milk", unit: "liters", expires: EXPIRED });
  await say("add_pantry_item", { name: "rice" });
  await say("add_pantry_item", { name: "dragonfruit" });
  await say("discard_expired");
  assert.equal(await say("pantry_summary"), "You have 1 rice, 1 dragonfruit.");
});
test("discard: lists multiple items", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 3, expires: EXPIRED });
  await say("add_pantry_item", { name: "bread", expires: EXPIRED });
  assert.equal(await say("discard_expired"), "Threw out 3 eggs, 1 bread.");
});

test("waste_report: no history", async () => assert.equal(await (await session()).say("waste_report"), "I don't have any usage history yet."));
test("waste_report: all used", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 3 });
  await say("use_pantry_item", { name: "eggs", quantity: 3 });
  assert.equal(await say("waste_report"), "You've used 3 items and wasted 0. That's 100 percent of your food eaten before it went off.");
});
test("waste_report: rounds the percentage", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "egg" });
  await say("use_pantry_item", { name: "egg" });
  await say("add_pantry_item", { name: "milk", unit: "liters", quantity: 2, expires: EXPIRED });
  await say("discard_expired");
  assert.equal(await say("waste_report"), "You've used 1 item and wasted 2. That's 33 percent of your food eaten before it went off.");
});
test("waste_report: all wasted", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "bread", expires: EXPIRED });
  await say("discard_expired");
  assert.match(await say("waste_report"), /That's 0 percent/);
});

test("suggest_recipe: empty pantry", async () => assert.match(await (await session()).say("suggest_recipe"), /pantry is empty/));
test("suggest_recipe: defaults to dinner", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice" });
  assert.match(await say("suggest_recipe"), /^For dinner/);
});
test("suggest_recipe: honours the meal", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice" });
  assert.match(await say("suggest_recipe", { meal: "snack" }), /^For snack/);
});
test("suggest_recipe: uses food expiring soonest first", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice" });
  await say("add_pantry_item", { name: "milk", unit: "liters" });
  await say("add_pantry_item", { name: "spinach" });
  assert.match(await say("suggest_recipe"), /spinach, milk, rice/);
});
test("suggest_recipe: invalid meal rejected", async () => assert.ok(await (await session()).rejects("suggest_recipe", { meal: "brunch" })));

test("plan_meals: empty pantry", async () => assert.match(await (await session()).say("plan_meals"), /can't plan/));
test("plan_meals: defaults to three days", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice" });
  const text = await say("plan_meals");
  assert.match(text, /Day 3:/);
  assert.doesNotMatch(text, /Day 4/);
});
test("plan_meals: single day", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "rice" });
  assert.equal(await say("plan_meals", { days: 1 }), "Day 1: something with rice.");
});
test("plan_meals: eight days rejected", async () => assert.ok(await (await session()).rejects("plan_meals", { days: 8 })));
test("plan_meals: zero days rejected", async () => assert.ok(await (await session()).rejects("plan_meals", { days: 0 })));

test("shopping: add", async () => assert.equal(await (await session()).say("manage_shopping_list", { action: "add", item: "milk" }), "Added milk to your shopping list."));
test("shopping: read empty", async () => assert.equal(await (await session()).say("manage_shopping_list", { action: "read" }), "Your shopping list is empty."));
test("shopping: read several", async () => {
  const { say } = await session();
  await say("manage_shopping_list", { action: "add", item: "milk" });
  await say("manage_shopping_list", { action: "add", item: "bread" });
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list has milk, bread.");
});
test("shopping: duplicates are ignored", async () => {
  const { say } = await session();
  await say("manage_shopping_list", { action: "add", item: "milk" });
  await say("manage_shopping_list", { action: "add", item: "Milk" });
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list has milk.");
});
test("shopping: names are normalised", async () => {
  const { say } = await session();
  await say("manage_shopping_list", { action: "add", item: "Eggs" });
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list has egg.");
});
test("shopping: remove", async () => {
  const { say } = await session();
  await say("manage_shopping_list", { action: "add", item: "milk" });
  assert.equal(await say("manage_shopping_list", { action: "remove", item: "milk" }), "Removed milk from your shopping list.");
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list is empty.");
});
test("shopping: removing a missing item is harmless", async () => {
  assert.equal(await (await session()).say("manage_shopping_list", { action: "remove", item: "milk" }), "Removed milk from your shopping list.");
});
test("shopping: clear", async () => {
  const { say } = await session();
  await say("manage_shopping_list", { action: "add", item: "milk" });
  assert.equal(await say("manage_shopping_list", { action: "clear" }), "Shopping list cleared.");
  assert.equal(await say("manage_shopping_list", { action: "read" }), "Your shopping list is empty.");
});
test("shopping: add without item asks which", async () => assert.equal(await (await session()).say("manage_shopping_list", { action: "add" }), "Which item should I add?"));
test("shopping: remove without item asks which", async () => assert.equal(await (await session()).say("manage_shopping_list", { action: "remove" }), "Which item should I remove?"));
test("shopping: unknown action rejected", async () => assert.ok(await (await session()).rejects("manage_shopping_list", { action: "shuffle" })));

test("summary: empty", async () => assert.equal(await (await session()).say("pantry_summary"), "Your pantry is empty."));
test("summary: lists items with units", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 6 });
  await say("add_pantry_item", { name: "milk", unit: "liters", quantity: 2 });
  assert.equal(await say("pantry_summary"), "You have 6 eggs, 2 liters milk.");
});
test("summary: output is plain spoken text", async () => {
  const { say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 6 });
  assert.doesNotMatch(await say("pantry_summary"), /[*#`\n]/);
});

test("households are isolated from each other", async () => {
  const a = await session("iso-a");
  const b = await session("iso-b");
  await a.say("add_pantry_item", { name: "eggs", quantity: 6 });
  assert.equal(await b.say("pantry_summary"), "Your pantry is empty.");
  assert.equal(await a.say("pantry_summary"), "You have 6 eggs.");
});
test("state survives a reconnect for the same household", async () => {
  const first = await session("persist-me");
  await first.say("add_pantry_item", { name: "eggs", quantity: 6 });
  assert.equal(await (await session("persist-me")).say("pantry_summary"), "You have 6 eggs.");
});
test("parallel adds in one household are not lost", async () => {
  const { say } = await session();
  await Promise.all(Array.from({ length: 20 }, () => say("add_pantry_item", { name: "egg" })));
  assert.equal(await say("pantry_summary"), "You have 20 eggs.");
});

test("resource: inventory returns JSON state", async () => {
  const { client, say } = await session();
  await say("add_pantry_item", { name: "eggs", quantity: 6 });
  const res = await client.readResource({ uri: "pantry://inventory" });
  const state = JSON.parse((res.contents[0] as { text: string }).text);
  assert.equal(state.pantry[0].name, "egg");
  assert.equal(state.pantry[0].quantity, 6);
  assert.deepEqual(state.shopping, []);
});
test("prompt: use_it_up is listed and returns a message", async () => {
  const { client } = await session();
  assert.ok((await client.listPrompts()).prompts.some((p) => p.name === "use_it_up"));
  const p = await client.getPrompt({ name: "use_it_up" });
  assert.match((p.messages[0].content as { text: string }).text, /expiring/);
});
test("unknown tool is an error", async () => assert.ok(await (await session()).rejects("does_not_exist", {})));
