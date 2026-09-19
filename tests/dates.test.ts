import test from "node:test";
import assert from "node:assert/strict";
import { newHome, validateHome, documentHTML } from "../src/home/core";
import { activateLabelSet, samePreset, presetItems } from "../src/home/presets";
import {
  sixMonthsFrom,
  initializeDates,
  addDate,
  applyDate,
  hasSelectedDate,
} from "../src/home/dates";

test("six-month default clamps month ends and handles leap years without assigning labels", () => {
  assert.equal(sixMonthsFrom(new Date(2026, 8, 18)), "2027-03-18");
  assert.equal(sixMonthsFrom(new Date(2026, 7, 31)), "2027-02-28");
  assert.equal(sixMonthsFrom(new Date(2027, 7, 31)), "2028-02-29");
  const p = activateLabelSet(newHome(), "en", 0);
  assert.equal(p.kitchenDates!.length, 1);
  assert.equal(p.selectedKitchenDate, p.kitchenDates![0].id);
  assert(p.items.every((item) => item.bestBefore === ""));
});

test("date selection and editing do not change labels; applying targets one group and survives save", () => {
  let p = activateLabelSet(newHome(), "en", 0);
  const firstId = p.selectedKitchenDate,
    firstDate = p.kitchenDates![0].date;
  const names = p.items.map((i) => i.name);
  p = applyDate(p, p.items[0]);
  assert(hasSelectedDate(p, p.items[0]));
  assert.equal(p.items[0].bestBefore, firstDate);
  assert(p.items.slice(1).every((item) => item.bestBefore === ""));
  p = addDate(p, "2028-02-29");
  assert.equal(p.kitchenDates!.length, 2);
  assert.notEqual(p.selectedKitchenDate, firstId);
  assert(!hasSelectedDate(p, p.items[0]));
  p = applyDate(p, p.items[1]);
  assert.equal(p.items[0].bestBefore, firstDate);
  assert.equal(p.items[1].bestBefore, "2028-02-29");
  p.kitchenDates![1].date = "2029-03-01";
  assert.equal(p.items[1].bestBefore, "2028-02-29");
  assert(!hasSelectedDate(p, p.items[1]));
  p = applyDate(p, p.items[1]);
  assert.equal(p.items[1].bestBefore, "2029-03-01");
  p.items[2].quantity = 0;
  p = applyDate(p, p.items[2]);
  assert.equal(p.items[2].quantity, 0);
  assert.deepEqual(
    p.items.map((i) => i.name),
    names,
  );
  assert.equal(
    p.items.filter((i) => samePreset(i, presetItems(p, 0)[0])).length,
    1,
  );
  p = validateHome(JSON.parse(JSON.stringify(p)));
  assert(hasSelectedDate(p, p.items[1]));
  const html = documentHTML(p);
  assert(html.includes('datetime="2029-03-01"'));
  assert(!html.includes("hm-date-color"));
  assert.throws(() => validateHome({ ...p, selectedKitchenDate: "missing" }));
  assert.throws(() =>
    validateHome({
      ...p,
      kitchenDates: [{ id: firstId!, date: "2027-02-29" }],
    }),
  );
});

test("legacy dates and archived language collections migrate without rewriting dates or counts", () => {
  const old = newHome();
  old.kitchenDate = "2027-10-10";
  old.items = [
    {
      id: "a",
      name: "BASIL",
      second: "",
      quantity: 3,
      bestBefore: "2027-10-10",
    },
  ];
  old.labelSets = { en: structuredClone(old.items) };
  const p = initializeDates(old, new Date(2026, 8, 18));
  assert.equal(p.items[0].bestBefore, "2027-10-10");
  assert.equal(p.items[0].quantity, 3);
  assert(
    p.kitchenDates!.some(
      (b) => b.date === "2027-10-10" && b.id === p.items[0].bestBeforeBadge,
    ),
  );
  assert.equal(p.items[0].bestBeforeBadge, p.labelSets!.en![0].bestBeforeBadge);
  assert.deepEqual(initializeDates(p), p);
});

test("three copies of one spice keep independent dates and one total quantity control", async () => {
  const { groupedQuantities, withTotalQuantity } =
    await import("../src/home/quantities");
  let p = activateLabelSet(newHome(), "en", 0);
  p = withTotalQuantity(p, p.items[0], 3);
  p.kitchenDates![0].date = "2027-01-01";
  p = applyDate(p, p.items[0], 0);
  p = addDate(p, "2028-02-02");
  p = applyDate(
    p,
    p.items.find((i) => i.name === "BASIL" && !i.bestBefore)!,
    0,
  );
  p = addDate(p, "2029-03-03");
  p = applyDate(
    p,
    p.items.find((i) => i.name === "BASIL" && !i.bestBefore)!,
    0,
  );
  const copies = p.items.filter((i) => i.name === "BASIL");
  assert.deepEqual(
    copies.map((i) => i.bestBefore),
    ["2027-01-01", "2028-02-02", "2029-03-03"],
  );
  const total = groupedQuantities(p.items).find((i) => i.name === "BASIL")!;
  assert.equal(total.quantity, 3);
  p = withTotalQuantity(p, total, 4);
  assert.equal(
    p.items.filter((i) => i.name === "BASIL").at(-1)!.bestBefore,
    "",
  );
  p = withTotalQuantity(p, total, 2);
  assert.deepEqual(
    p.items.filter((i) => i.name === "BASIL").map((i) => i.bestBefore),
    ["2027-01-01", "2028-02-02"],
  );
  p = withTotalQuantity(p, total, 0);
  assert.equal(
    groupedQuantities(p.items).find((i) => i.name === "BASIL")!.quantity,
    0,
  );
});

test("new dates do not edit existing badges and legacy mismatched associations recover their original date", () => {
  let p = activateLabelSet(newHome(), "en", 0);
  p = applyDate(p, p.items[0]);
  const original = p.items[0].bestBefore!;
  p.kitchenDates![0].date = "2039-12-31"; // Legacy editable-badge project.
  p = initializeDates(p);
  assert(
    p.kitchenDates!.some(
      (b) => b.id === p.items[0].bestBeforeBadge && b.date === original,
    ),
  );
  const badges = structuredClone(p.kitchenDates);
  p = addDate(p, "2040-01-01");
  assert.deepEqual(p.kitchenDates!.slice(0, -1), badges);
  assert.equal(p.items[0].bestBefore, original);
  const count = p.kitchenDates!.length;
  p = addDate(p, original);
  assert.equal(p.kitchenDates!.length, count);
  assert.equal(p.selectedKitchenDate, p.items[0].bestBeforeBadge);
});
