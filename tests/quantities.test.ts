import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newHome,
  placements,
  validateHome,
  documentHTML,
} from "../src/home/core";
import { groupedItems, withQuantity, groupedQuantities, withTotalQuantity, withName } from "../src/home/quantities";
import { activateLabelSet, presetItems, samePreset } from "../src/home/presets";
test("duplicates share a quantity, zero remains editable after saving, and inactive labels never print", () => {
  const p = newHome();
  p.items = [
    { id: "1", name: "Salt", second: "", quantity: 1 },
    { id: "2", name: "Salt", second: "", quantity: 2 },
    { id: "3", name: "Sugar", second: "", quantity: 1 },
  ];
  const grouped = groupedItems(p.items);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].quantity, 3);
  const off = withQuantity(p, grouped[0], 0);
  assert.equal(off.items[0].name, "Salt");
  assert.equal(off.items[0].quantity, 0);
  assert.equal(placements(off)[0].length, 1);
  assert(!documentHTML(off).includes(">Salt<"));
  const saved = validateHome(JSON.parse(JSON.stringify(off)));
  const on = withQuantity(saved, saved.items[0], 2);
  assert.equal(placements(on)[0].length, 3);
  assert.equal(p.items.length, 3);
  const bulk = withQuantity(on, on.items[0], 201);
  assert.equal(groupedItems(bulk.items)[0].quantity, 201);
  assert.equal(placements(bulk).flat().length, 202);
});

test("renaming preserves badge order, separate dates, zero counts and language archives", () => {
  let p = activateLabelSet(newHome(), "en", 0);
  const first = p.items[0];
  p.items.splice(1, 0, { ...first, id: "another-copy", bestBefore: "2028-01-01" });
  p = withName(p, first, "Fresh basil");
  assert.equal(groupedQuantities(p.items).length, 16);
  assert.deepEqual(p.items.slice(0, 2).map(i => [i.name, i.bestBefore]), [["Fresh basil", ""], ["Fresh basil", "2028-01-01"]]);
  assert(samePreset(p.items[0], presetItems(p, 0)[0]));
  p = withTotalQuantity(p, groupedQuantities(p.items)[0], 3);
  assert.equal(groupedQuantities(p.items)[0].quantity, 3);
  assert.equal(p.items.at(-1)?.originalName, "BASIL");
  p = withName(p, p.items[0], "PARSLEY");
  assert.equal(groupedQuantities(p.items).length, 16);
  p = activateLabelSet(activateLabelSet(p, "zh-Hans", 0), "en", 0);
  assert.equal(p.items[0].name, "PARSLEY");
  p = withTotalQuantity(p, groupedQuantities(p.items)[0], 0);
  p = withName(p, p.items[0], "Dried basil");
  p = validateHome(JSON.parse(JSON.stringify(p)));
  p = withTotalQuantity(p, p.items[0], 2);
  assert.equal(groupedQuantities(p.items)[0].quantity, 2);
  assert(documentHTML(p).includes("Dried basil"));
  assert.throws(() => withName(p, p.items[0], "  "));
  assert.throws(() => withName(p, p.items[0], "x".repeat(121)));
});
