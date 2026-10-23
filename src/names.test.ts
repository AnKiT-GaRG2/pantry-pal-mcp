import { test } from "node:test";
import assert from "node:assert/strict";
import { isPlural, normalizeName, plural, spokenName } from "./names.js";

const normalizeCases: [string, string][] = [
  ["Eggs", "egg"], ["an egg", "egg"], ["tomatoes", "tomato"], ["berries", "berry"], ["peaches", "peach"],
  ["the spinach", "spinach"], ["hummus", "hummus"], ["rice", "rice"], ["bananas", "banana"],
  ["  EGGS  ", "egg"], ["some rice", "rice"], ["my milk", "milk"], ["the  green   beans", "green bean"],
  ["cherries", "cherry"], ["boxes", "box"], ["dishes", "dish"], ["potatoes", "potato"], ["mangoes", "mango"],
  ["avocadoes", "avocado"], ["couscous", "couscous"], ["asparagus", "asparagus"], ["grass", "grass"],
  ["oats", "oat"], ["peas", "pea"], ["lentils", "lentil"], ["noodles", "noodle"], ["radishes", "radish"],
  ["cookies", "cookie"], ["brownies", "brownie"], ["smoothies", "smoothie"], ["a apple", "apple"], ["puppies", "puppy"], ["parties", "party"], ["pies", "pie"], ["apple pies", "apple pie"],
];
for (const [raw, want] of normalizeCases) {
  test(`normalizeName(${JSON.stringify(raw)}) -> ${want}`, () => assert.equal(normalizeName(raw), want));
}

test("normalizeName is idempotent", () => {
  for (const [, want] of normalizeCases) assert.equal(normalizeName(want), want, want);
});

const spokenCases: [string, number, string | undefined, string][] = [
  ["egg", 6, undefined, "eggs"], ["egg", 1, undefined, "egg"], ["milk", 3, undefined, "milk"],
  ["berry", 2, undefined, "berries"], ["tomato", 2, undefined, "tomatoes"], ["peach", 2, undefined, "peaches"],
  ["rice", 2, "kg", "rice"], ["egg", 2, "kg", "egg"], ["egg", 0, undefined, "eggs"], ["egg", 1.5, undefined, "eggs"],
  ["boy", 2, undefined, "boys"], ["glass", 2, undefined, "glasses"], ["apple", 12, undefined, "apples"],
  ["hummus", 2, undefined, "hummus"], ["cherry", 3, undefined, "cherries"], ["dish", 2, undefined, "dishes"],
  ["mango", 2, undefined, "mangoes"], ["bread", 4, undefined, "bread"],
];
for (const [name, count, unit, want] of spokenCases) {
  test(`spokenName(${name}, ${count}, ${unit ?? "count"}) -> ${want}`, () => assert.equal(spokenName(name, count, unit), want));
}

test("isPlural follows spokenName", () => {
  assert.equal(isPlural("egg", 1), false);
  assert.equal(isPlural("egg", 2), true);
  assert.equal(isPlural("milk", 5), false);
  assert.equal(isPlural("egg", 2, "kg"), false);
});

test("plural picks singular only for exactly one", () => {
  assert.equal(plural(1, "item"), "item");
  assert.equal(plural(2, "item"), "items");
  assert.equal(plural(0, "item"), "items");
  assert.equal(plural(2, "berry", "berries"), "berries");
});
