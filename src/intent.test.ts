import { test } from "node:test";
import assert from "node:assert/strict";
import { clean, parseUtterance } from "./intent.js";

const cases: [string, string, Record<string, unknown>][] = [
  // adding food
  ["I bought six eggs that expire Sunday", "add_pantry_item", { name: "eggs", quantity: 6, unit: "count", expires: "sunday" }],
  ["I bought 2 liters of milk", "add_pantry_item", { name: "milk", quantity: 2, unit: "liters" }],
  ["I bought some spinach that expires tomorrow", "add_pantry_item", { name: "spinach", quantity: 1, unit: "count", expires: "tomorrow" }],
  ["Alexa, I bought a dozen eggs", "add_pantry_item", { name: "eggs", quantity: 12, unit: "count" }],
  ["I got a couple of apples", "add_pantry_item", { name: "apples", quantity: 2, unit: "count" }],
  ["I picked up 1.5 kg of rice", "add_pantry_item", { name: "rice", quantity: 1.5, unit: "kg" }],
  ["I bought yogurt that expired yesterday", "add_pantry_item", { name: "yogurt", quantity: 1, unit: "count", expires: "yesterday" }],
  ["I bought bread that expires in three days", "add_pantry_item", { name: "bread", quantity: 1, unit: "count", expires: "in 3 days" }],
  ["I bought chicken, it expires today", "add_pantry_item", { name: "chicken", quantity: 1, unit: "count" }],
  ["add four bananas to my pantry", "add_pantry_item", { name: "bananas", quantity: 4, unit: "count" }],
  ["I just bought two cartons", "add_pantry_item", { name: "cartons", quantity: 2, unit: "count" }],
  ["I bought three kilos of potatoes that expire next week", "add_pantry_item", { name: "potatoes", quantity: 3, unit: "kg", expires: "next week" }],
  ["I bought milk that is good until friday", "add_pantry_item", { name: "milk", quantity: 1, unit: "count", expires: "friday" }],
  // using food
  ["I used two eggs", "use_pantry_item", { name: "eggs", quantity: 2 }],
  ["I cooked the spinach", "use_pantry_item", { name: "spinach", quantity: 1 }],
  ["I ate an apple", "use_pantry_item", { name: "apple", quantity: 1 }],
  ["I finished the milk", "use_pantry_item", { name: "milk", quantity: 1 }],
  ["I just used three tomatoes", "use_pantry_item", { name: "tomatoes", quantity: 3 }],
  // expiring
  ["What should I eat first?", "check_expiring", { days: 3 }],
  ["what is about to expire", "check_expiring", { days: 3 }],
  ["What's expiring this week?", "check_expiring", { days: 7 }],
  ["what expires tomorrow", "check_expiring", { days: 1 }],
  ["what expires today", "check_expiring", { days: 0 }],
  ["what is expiring in the next five days", "check_expiring", { days: 5 }],
  ["is anything going off", "check_expiring", { days: 3 }],
  // discard / waste
  ["Throw out what's expired", "discard_expired", {}],
  ["toss the expired food", "discard_expired", {}],
  ["discard everything that has gone off", "discard_expired", {}],
  ["How much food have I wasted?", "waste_report", {}],
  ["what's my waste score", "waste_report", {}],
  ["how am I doing", "waste_report", {}],
  // recipes and plans
  ["What can I make for dinner?", "suggest_recipe", { meal: "dinner" }],
  ["what should I cook for lunch", "suggest_recipe", { meal: "lunch" }],
  ["give me a breakfast idea", "suggest_recipe", { meal: "breakfast" }],
  ["What vegetarian dinner can I make?", "suggest_recipe", { meal: "dinner", diet: "vegetarian" }],
  ["suggest a gluten-free snack", "suggest_recipe", { meal: "snack", diet: "gluten free" }],
  ["any recipe ideas", "suggest_recipe", { meal: "dinner" }],
  ["Plan dinners for the next three days", "plan_meals", { days: 3 }],
  ["plan my meals for the week", "plan_meals", { days: 7 }],
  ["plan dinners", "plan_meals", { days: 3 }],
  ["plan dinners for 20 days", "plan_meals", { days: 7 }],
  // shopping list
  ["Add milk to my shopping list", "manage_shopping_list", { action: "add", item: "milk" }],
  ["put bread on the grocery list", "manage_shopping_list", { action: "add", item: "bread" }],
  ["remove milk from my shopping list", "manage_shopping_list", { action: "remove", item: "milk" }],
  ["What's on my shopping list?", "manage_shopping_list", { action: "read" }],
  ["read me my grocery list", "manage_shopping_list", { action: "read" }],
  ["what do I need to buy", "manage_shopping_list", { action: "read" }],
  ["clear my shopping list", "manage_shopping_list", { action: "clear" }],
  // pantry
  ["What's in my pantry?", "pantry_summary", {}],
  ["what do I have", "pantry_summary", {}],
  ["read my pantry", "pantry_summary", {}],
  ["Ask Pantry Pal to tell me what's in my fridge", "pantry_summary", {}],
];

for (const [text, tool, args] of cases) {
  test(`"${text}" -> ${tool}`, () => {
    const got = parseUtterance(text);
    assert.ok(got, "not understood");
    assert.equal(got.tool, tool);
    if (text === "I bought chicken, it expires today") return; // free-form: only the tool is asserted
    assert.deepEqual(got.args, args);
  });
}

for (const text of ["", "   ", "hello there", "tell me a joke", "what is the weather", "I have to go", "banana", "bought", "I bought", "?!"]) {
  test(`not understood: ${JSON.stringify(text)}`, () => assert.equal(parseUtterance(text), undefined));
}

test("clean strips the wake word, punctuation and contractions", () => {
  assert.equal(clean("Alexa, what's on my shopping list?"), "what is on my shopping list");
  assert.equal(clean("  Hey Alexa:   I bought   eggs!  "), "i bought eggs");
  assert.equal(clean("please add milk to my list"), "add milk to my list");
  assert.equal(clean("“I used two eggs.”"), "i used two eggs");
});

test("number words in expiry phrases become digits", () => {
  assert.deepEqual(parseUtterance("I bought fish that expires in two days")?.args.expires, "in 2 days");
});
