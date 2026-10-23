import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, daysUntil, estimateExpiry, isoDate, parseExpiry } from "./dates.js";

const wed = new Date(2026, 9, 21, 15, 0); // Wed 21 Oct 2026, local

const parseCases: [string, string | undefined][] = [
  ["today", "2026-10-21"], ["Tomorrow", "2026-10-22"], ["in 3 days", "2026-10-24"], ["2 weeks", "2026-11-04"],
  ["next week", "2026-10-28"], ["tonight", "2026-10-21"], ["  TODAY ", "2026-10-21"], ["1 day", "2026-10-22"],
  ["in 1 day", "2026-10-22"], ["in 10 days", "2026-10-31"], ["in 1 week", "2026-10-28"], ["3 weeks", "2026-11-11"],
  ["friday", "2026-10-23"], ["on friday", "2026-10-23"], ["wednesday", "2026-10-28"], ["next friday", "2026-10-30"],
  ["monday", "2026-10-26"], ["tuesday", "2026-10-27"], ["thursday", "2026-10-22"], ["saturday", "2026-10-24"],
  ["sunday", "2026-10-25"], ["next monday", "2026-11-02"], ["this friday", "2026-10-23"], ["FRIDAY", "2026-10-23"],
  ["2026-12-01", "2026-12-01"], ["2026-12-31", "2026-12-31"], ["2020-01-01", "2020-01-01"],
  ["2026-13-45", undefined], ["someday", undefined], ["", undefined], ["yesterday", "2026-10-20"], ["3 days ago", "2026-10-18"], ["1 week ago", "2026-10-14"],
  ["in -3 days", undefined], ["friday afternoon", undefined], ["26-12-01", undefined], ["in a few days", undefined],
];
for (const [text, want] of parseCases) {
  test(`parseExpiry(${JSON.stringify(text)}) -> ${want}`, () => assert.equal(parseExpiry(text, wed), want));
}

test("daysUntil counts calendar days regardless of time of day", () => {
  assert.equal(daysUntil("2026-10-22", wed), 1);
  assert.equal(daysUntil("2026-10-21", new Date(2026, 9, 21, 23, 59)), 0);
  assert.equal(daysUntil("2026-10-20", wed), -1);
  assert.equal(daysUntil("2026-10-31", wed), 10);
  assert.equal(daysUntil("2026-10-21", new Date(2026, 9, 21, 0, 0)), 0);
});

test("addDays crosses month boundary", () => assert.equal(addDays("2026-10-30", 3), "2026-11-02"));
test("addDays crosses year boundary", () => assert.equal(addDays("2026-12-31", 1), "2027-01-01"));
test("addDays handles leap day", () => assert.equal(addDays("2028-02-28", 1), "2028-02-29"));
test("addDays skips leap day in common year", () => assert.equal(addDays("2027-02-28", 1), "2027-03-01"));
test("addDays goes backwards", () => assert.equal(addDays("2026-10-01", -1), "2026-09-30"));
test("addDays zero is identity", () => assert.equal(addDays("2026-10-21", 0), "2026-10-21"));

test("isoDate pads month and day", () => assert.equal(isoDate(new Date(2026, 0, 5)), "2026-01-05"));
test("isoDate uses local calendar date late at night", () => assert.equal(isoDate(new Date(2026, 11, 31, 23, 59)), "2026-12-31"));

const shelfCases: [string, string | undefined][] = [
  ["Eggs", "2026-11-11"], ["milk", "2026-10-28"], ["tomatoes", "2026-10-28"], ["rice", "2027-10-21"],
  ["berries", "2026-10-26"], ["strawberries", "2026-10-26"], ["an onion", "2026-11-20"], ["chicken", "2026-10-23"],
  ["peaches", "2026-10-26"], ["butter", "2026-12-20"], ["Bread", "2026-10-26"], ["dragonfruit", undefined], ["", undefined],
];
for (const [name, want] of shelfCases) {
  test(`estimateExpiry(${JSON.stringify(name)}) -> ${want}`, () => assert.equal(estimateExpiry(name, wed), want));
}
