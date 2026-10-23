import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeName } from "./names.js";

test("singular and plural collapse to one name", () => {
  for (const [raw, want] of [["Eggs", "egg"], ["an egg", "egg"], ["tomatoes", "tomato"], ["berries", "berry"], ["peaches", "peach"], ["the spinach", "spinach"], ["hummus", "hummus"], ["rice", "rice"], ["bananas", "banana"]]) {
    assert.equal(normalizeName(raw), want, raw);
  }
});
