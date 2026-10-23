import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, daysUntil, estimateExpiry, parseExpiry } from "./dates.js";

const wed = new Date(2026, 9, 21, 15, 0); // Wed 21 Oct 2026, local

test("relative words", () => {
  assert.equal(parseExpiry("today", wed), "2026-10-21");
  assert.equal(parseExpiry("Tomorrow", wed), "2026-10-22");
  assert.equal(parseExpiry("in 3 days", wed), "2026-10-24");
  assert.equal(parseExpiry("2 weeks", wed), "2026-11-04");
  assert.equal(parseExpiry("next week", wed), "2026-10-28");
});

test("weekdays", () => {
  assert.equal(parseExpiry("friday", wed), "2026-10-23");
  assert.equal(parseExpiry("on friday", wed), "2026-10-23");
  assert.equal(parseExpiry("wednesday", wed), "2026-10-28", "same weekday means next week");
  assert.equal(parseExpiry("next friday", wed), "2026-10-30");
});

test("iso and junk", () => {
  assert.equal(parseExpiry("2026-12-01", wed), "2026-12-01");
  assert.equal(parseExpiry("2026-13-45", wed), undefined);
  assert.equal(parseExpiry("someday", wed), undefined);
});

test("daysUntil counts calendar days regardless of time of day", () => {
  assert.equal(daysUntil("2026-10-22", wed), 1);
  assert.equal(daysUntil("2026-10-21", new Date(2026, 9, 21, 23, 59)), 0);
  assert.equal(daysUntil("2026-10-20", wed), -1);
});

test("addDays crosses month boundary", () => assert.equal(addDays("2026-10-30", 3), "2026-11-02"));

test("shelf life estimate", () => {
  assert.equal(estimateExpiry("Eggs", wed), "2026-11-11");
  assert.equal(estimateExpiry("dragonfruit", wed), undefined);
});
