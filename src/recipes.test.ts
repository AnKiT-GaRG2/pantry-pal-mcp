import { test } from "node:test";
import assert from "node:assert/strict";

delete process.env.BEDROCK_MODEL_ID; // force the local fallback
const { planMeals, suggestRecipe } = await import("./recipes.js");

const item = (name: string, expires?: string) => ({ name, quantity: 1, unit: "count", expires });
const three = [item("spinach"), item("milk"), item("rice"), item("egg")];

test("suggestRecipe on empty pantry says so", async () => {
  const r = await suggestRecipe([], "dinner");
  assert.equal(r.source, "local");
  assert.match(r.text, /pantry is empty/);
});

test("suggestRecipe falls back locally without a model id", async () => assert.equal((await suggestRecipe(three, "dinner")).source, "local"));
test("suggestRecipe mentions the meal", async () => assert.match((await suggestRecipe(three, "breakfast")).text, /^For breakfast/));
test("suggestRecipe uses the first three items only", async () => {
  const { text } = await suggestRecipe(three, "lunch");
  assert.match(text, /spinach, milk, rice/);
  assert.doesNotMatch(text, /egg/);
});
test("suggestRecipe ignores diet in local mode without crashing", async () => assert.equal((await suggestRecipe(three, "dinner", "vegan")).source, "local"));
test("suggestRecipe text has no markdown", async () => assert.doesNotMatch((await suggestRecipe(three, "dinner")).text, /[*#`\-]\s|\n/));

test("planMeals on empty pantry says so", async () => assert.match((await planMeals([], 3)).text, /can't plan/));
test("planMeals produces one line per day", async () => {
  const { text } = await planMeals(three, 3);
  assert.match(text, /Day 1: .*Day 2: .*Day 3:/);
  assert.doesNotMatch(text, /Day 4/);
});
test("planMeals single day", async () => assert.equal((await planMeals(three, 1)).text, "Day 1: something with spinach."));
test("planMeals cycles when days exceed items", async () => {
  const { text } = await planMeals([item("rice"), item("egg")], 4);
  assert.equal(text, "Day 1: something with rice. Day 2: something with egg. Day 3: something with rice. Day 4: something with egg.");
});
test("planMeals reports local source", async () => assert.equal((await planMeals(three, 2)).source, "local"));

test("local suggestions use spoken plurals", async () => {
  const eggs = { name: "egg", quantity: 6, unit: "count" };
  assert.match((await suggestRecipe([eggs, item("milk")], "dinner")).text, /with eggs, milk\./);
  assert.equal((await planMeals([eggs], 1)).text, "Day 1: something with eggs.");
});
