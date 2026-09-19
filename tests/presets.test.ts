import test from "node:test";
import assert from "node:assert/strict";
import { newHome, validateHome, englishKitchenNames } from "../src/home/core";
import { activateLabelSet, presetItems } from "../src/home/presets";
import { homeLanguages } from "../src/home/i18n";
import { withQuantity, withName } from "../src/home/quantities";
import { applyDate } from "../src/home/dates";

test("all 24 kitchen starters have 16 unique labels at one and culturally distinct contents", () => {
  for (const language of homeLanguages) {
    const p = activateLabelSet(newHome(), language, 0);
    assert.equal(p.items.length, 16, language);
    assert.equal(new Set(p.items.map((i) => i.name)).size, 16, language);
    assert(
      p.items.every((i) => i.quantity === 1 && (language === "en" || i.second)),
      language,
    );
    assert.deepEqual(validateHome(JSON.parse(JSON.stringify(p))), p);
  }
  assert.deepEqual(
    activateLabelSet(newHome(), "en", 0).items.map((i) => i.name),
    [...englishKitchenNames],
  );
  for (const [language, name] of [
    ["zh-Hans", "花椒"],
    ["ja", "味噌"],
    ["ko", "고추장"],
    ["hi", "हींग"],
    ["ar", "سماق"],
  ])
    assert(
      activateLabelSet(newHome(), language, 0).items.some(
        (i) => i.name === name,
      ),
    );
});

test("language switching and saved defaults preserve personal counts, custom text, zero, and geometry", () => {
  let p = activateLabelSet(newHome(), "zh-Hans", 0);
  p = withQuantity(p, p.items[0], 0);
  p = withQuantity(p, p.items[1], 3);
  p.items.push({ id: "custom", name: "自制调料", second: "", quantity: 2 });
  const original = structuredClone(p.items),
    paper = structuredClone(p.paper);
  p = activateLabelSet(p, "en", 0);
  assert(!p.items.some((i) => /[盐糖]/u.test(i.name)));
  p = withQuantity(p, p.items[0], 4);
  p = activateLabelSet(p, "zh-Hans", 0);
  assert.deepEqual(p.items, original);
  assert.deepEqual(p.paper, paper);
  p = activateLabelSet(validateHome(JSON.parse(JSON.stringify(p))), "en", 0);
  assert.equal(p.items[0].quantity, 4);
  // Removed items (e.g. a voice-generated list) must not be seeded again on reload.
  p.items = p.items.slice(0, 2);
  assert.equal(activateLabelSet(p, "en", 0).items.length, 2);
  assert.equal(presetItems(p, 0).length, 16);
});

test("legacy English Chinese entries migrate without losing counts and cannot leak back", () => {
  const old = newHome();
  old.outputLanguage = "en";
  old.items = [
    { id: "salt", name: "盐", second: "Salt", quantity: 3 },
    { id: "sugar", name: "糖", second: "Sugar", quantity: 0 },
  ];
  let p = activateLabelSet(old, "en", 0);
  assert.equal(p.items.length, 16);
  p = activateLabelSet(p, "zh-Hans", 0);
  assert.equal(p.items.find((i) => i.name === "盐")?.quantity, 3);
  assert.equal(p.items.find((i) => i.name === "糖")?.quantity, 0);
  assert.equal(p.items.length, 16);
  p = activateLabelSet(p, "en", 0);
  assert.equal(p.items.length, 16);
  assert.throws(() => validateHome({ ...p, labelSets: { xx: [] } }));
  assert.throws(() => validateHome({ ...p, presetGroups: { en: [2] } }));
});

test("Kitchen and Storage boxes keep independent lists in all 24 languages", () => {
  for (const language of homeLanguages) {
    let p = activateLabelSet(newHome(), language, 0);
    p = withName(p, p.items[0], "Custom kitchen");
    p = withQuantity(p, p.items[0], 0);
    p.items.push({ id: "custom-kitchen", name: "My own spice", second: "", quantity: 2 });
    if (language === "en") p = applyDate(p, p.items[1]);
    const kitchen = structuredClone(p.items);
    p = activateLabelSet(p, language, 1);
    assert.equal(p.items.length, 8, language);
    assert.equal(p.activeGroup, 1);
    assert(p.items.every(item => !kitchen.some(k => k.id === item.id)));
    p = withName(p, p.items[0], "Custom storage");
    p = withQuantity(p, p.items[0], 3);
    p.items.push({ id: "custom-box", name: "My own box", second: "", quantity: 1 });
    const boxes = structuredClone(p.items);
    p = activateLabelSet(p, language, 0);
    assert.deepEqual(p.items, kitchen);
    p = activateLabelSet(validateHome(JSON.parse(JSON.stringify(p))), language, 1);
    assert.deepEqual(p.items, boxes);
    p = activateLabelSet(p, language === "en" ? "zh-Hans" : "en", 1);
    p = activateLabelSet(p, language, 1);
    assert.deepEqual(p.items, boxes);
    p = activateLabelSet(p, language, 0);
    assert.deepEqual(p.items, kitchen);
  }
});

test("legacy mixed lists split once without losing renamed, zero, dated or custom labels", () => {
  for (const language of homeLanguages) {
    const old = newHome();
    old.outputLanguage = language;
    old.presetGroups = { [language]: [0, 1] };
    const kitchen = presetItems(old, 0).map((i, index) => ({ ...i, id: `k-${index}` }));
    const boxes = presetItems(old, 1).map((i, index) => ({ ...i, id: `b-${index}` }));
    boxes[0] = { ...boxes[0], originalName: boxes[0].name, name: "Renamed box", quantity: 0 };
    boxes[1] = { ...boxes[1], bestBefore: "2028-02-03", bestBeforeBadge: "legacy-date" };
    kitchen[0] = { ...kitchen[0], originalName: kitchen[0].name, name: "Renamed spice", bestBefore: "2028-02-03" };
    const custom = { id: "custom", name: "Unclassified custom label", second: "", quantity: 3 };
    old.items = [...kitchen, ...boxes, custom];
    old.kitchenDates = [{ id: "legacy-date", date: "2028-02-03" }];
    old.selectedKitchenDate = "legacy-date";
    old.labelSets = { [language]: [] }; // Active items override stale archives.
    const original = structuredClone(old);
    let p = activateLabelSet(old, language, 1);
    assert.deepEqual(p.items, boxes, language);
    assert.equal(p.items[0].quantity, 0);
    p = activateLabelSet(p, language, 0);
    assert.deepEqual(p.items.map(i => i.id), [...kitchen, custom].map(i => i.id));
    assert.equal(p.items[0].bestBefore, "2028-02-03");
    assert(p.kitchenDates!.some(d => d.id === p.items[0].bestBeforeBadge && d.date === "2028-02-03"));
    assert.deepEqual(old, original);
    assert.deepEqual(activateLabelSet(p, language, 0), p);
    assert.throws(() => validateHome({ ...p, activeGroup: 2 }));
    assert.throws(() => validateHome({ ...p, categorySets: { en: { other: [] } } }));
  }
});
