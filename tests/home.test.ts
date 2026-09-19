import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newHome,
  validBestBefore,
  englishKitchenNames,
  validateHome,
  papers,
  validPaper,
  rankedPapers,
  placements,
  parseList,
  documentHTML,
} from "../src/home/core";
import messages from "../src/home/messages.json";
import words from "../src/home/words.json";
import { languages } from "../src/i18n";
import {
  countryForTimeZone,
  regionChoices,
  regionCodes,
  languageMarkets,
} from "../src/home/regional";
test("region suggestions combine Canadian timezone and Chinese language without inferring location from language", () => {
  assert.equal(countryForTimeZone("America/Toronto"), "CA");
  assert.equal(countryForTimeZone("America/Montreal"), "CA");
  assert.equal(countryForTimeZone("Asia/Shanghai"), "CN");
  assert.equal(countryForTimeZone("UTC"), "");
  assert.equal(countryForTimeZone("invalid"), "");
  const choices = regionChoices("CA", "", "CA", "zh-Hans", ["zh-CN", "en-CA"]);
  assert.deepEqual(choices.suggested.slice(0, 3), ["CA", "CN", "SG"]);
  assert.equal(regionChoices("GB", "CN", "CA", "zh-Hans").suggested[0], "GB");
  assert.deepEqual(
    Object.keys(languageMarkets).sort(),
    languages.map((l) => l.code).sort(),
  );
  for (const { code } of languages) {
    const { suggested, remaining } = regionChoices("CA", "JP", "CA", code, [
      "zh-CN",
    ]);
    assert.deepEqual(
      [...suggested, ...remaining].sort(),
      [...regionCodes].sort(),
    );
    assert.equal(
      new Set([...suggested, ...remaining]).size,
      regionCodes.length,
    );
  }
  assert.equal(rankedPapers("CA", "zh-Hans")[0].id, "letter-30");
  assert.equal(rankedPapers("KR", "en")[0].id, "a4-24-64");
  assert.equal(rankedPapers("", "ko")[0].id, "a4-24-64");
  const chinese = rankedPapers("", "zh-Hans");
  assert(
    chinese.findIndex((p) => p.id === "a4-24") <
      chinese.findIndex((p) => p.id === "letter-30"),
  );
});
test("every language and region retains every size and never changes selected geometry", () => {
  const ids = papers.map((p) => p.id).sort();
  const project = newHome();
  project.paper = { ...papers[1] };
  for (const { code } of languages)
    for (const region of ["CA", "CN", "GB", "JP", "IN", "IL", "", "ZA"]) {
      assert.deepEqual(
        rankedPapers(region, code)
          .map((p) => p.id)
          .sort(),
        ids,
      );
      assert.deepEqual(validateHome({ ...project, region }).paper, papers[1]);
    }
  assert.equal(rankedPapers("CA", "zh-Hans")[0].id, "letter-30");
  assert.equal(rankedPapers("CN", "en").length, papers.length);
});
test("all presets fit; label counts, second pages and offsets are exact", () => {
  for (const p of papers) validPaper(p);
  const project = newHome();
  project.items = parseList("盐 | Salt ×22");
  project.bilingual = true;
  const pages = placements(project);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].length, 21);
  assert.equal(pages[1].length, 1);
  assert.equal(pages[0][0].x, 7.25);
  assert.equal(pages[0][3].y, 53.25);
  assert.equal(pages[1][0].x, 7.25);
  const before = JSON.stringify(project);
  documentHTML(project);
  assert.equal(JSON.stringify(project), before);
  for (const offset of [-300, -15, 15, 300]) {
    const shifted = validateHome({ ...project, offsetX: offset, offsetY: offset });
    const first = placements(shifted)[0][0];
    assert.equal(first.x, pages[0][0].x + offset);
    assert.equal(first.y, pages[0][0].y + offset);
  }
  for (const offset of [NaN, Infinity, -Infinity]) {
    assert.throws(() => validateHome({ ...project, offsetX: offset }));
    assert.throws(() => validateHome({ ...project, offsetY: offset }));
  }
  assert.throws(() => validPaper({ ...papers[2], height: 37.25 }));
});
test("bad imported files and unbounded quantities cannot reach print", () => {
  const p = newHome();
  for (const quantity of [-1, 1.2, 101, Infinity])
    assert.throws(() =>
      validateHome({
        ...p,
        items: [{ id: "a", name: "x", second: "", quantity }],
      }),
    );
  assert.throws(() => validateHome({ ...p, items: parseList("盐 ×501") }));
  assert.throws(() =>
    validateHome({ ...p, paper: { ...p.paper, width: NaN } }),
  );
  const html = documentHTML({
    ...p,
    items: parseList("<img src=x onerror=alert(1)>"),
  });
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<img"));
  assert.throws(() =>
    validateHome({
      ...p,
      items: [
        { id: "x", name: "a", second: "", quantity: 1 },
        { id: "x", name: "b", second: "", quantity: 1 },
      ],
    }),
  );
});
test("screen outlines include empty label slots and do not enter the print document", () => {
  const project = newHome();
  assert.equal(
    (
      documentHTML(project, false, { guides: true }).match(
        /class="guide preview-guide"/g,
      ) || []
    ).length,
    21,
  );
  assert.throws(() => documentHTML(project));
  project.items = parseList("Salt ×22");
  const before = JSON.stringify(project);
  const print = documentHTML(project);
  const preview = documentHTML(project, false, { guides: true });
  assert.equal(
    (preview.match(/class="guide preview-guide"/g) || []).length,
    42,
  );
  assert(!print.includes('class="guide preview-guide"'));
  assert.equal(documentHTML(project), print);
  assert.equal(JSON.stringify(project), before);
});
test("all 24 home interfaces and starter word packs are complete", () => {
  assert.deepEqual(
    Object.keys(messages).sort(),
    languages.map((l) => l.code).sort(),
  );
  for (const code of Object.keys(messages) as (keyof typeof messages)[]) {
    assert.deepEqual(
      Object.keys(messages[code]).sort(),
      Object.keys(messages.en).sort(),
    );
    assert.ok(Object.values(messages[code]).every((x) => x.trim().length));
    assert.equal(words[code].length, 16);
  }
});

// Printer compensation moves ink, never the pre-cut paper beneath it.
test("paper preview cut lines remain fixed while printer offsets move text", () => {
  const project = newHome();
  project.paper = { ...papers.find((p) => p.id === "a4-21")! };
  project.items = [{ id: "offset", name: "Salt", second: "", quantity: 1 }];
  project.offsetX = 1;
  project.offsetY = 2;
  const html = documentHTML(project, false, { guides: true });
  assert(
    html.includes(
      'class="guide preview-guide" style="left:7.25mm;top:15.15mm"',
    ),
  );
  assert(html.includes("left:8.25mm;top:17.15mm"));
  assert(!documentHTML(project).includes('class="sheet preview-paper"'));
});

test("English pantry dates persist, reject invalid calendars, and print only the requested fields", () => {
  for (const invalid of [
    "2027-02-29",
    "2028-02-30",
    "0000-01-01",
    "2027-13-01",
    "<script>",
  ])
    assert.equal(validBestBefore(invalid), false);
  assert(validBestBefore("2028-02-29"));
  const project = newHome();
  project.kitchenDate = "2028-02-29";
  project.style = "frame";
  project.bilingual = true;
  project.items = englishKitchenNames.map((name, i) => ({
    id: String(i),
    name,
    second: "SHOULD NOT PRINT",
    quantity: 1,
    bestBefore: project.kitchenDate,
  }));
  const restored = validateHome(JSON.parse(JSON.stringify(project)));
  const html = documentHTML(restored);
  assert.equal((html.match(/class="label pantry"/g) || []).length, 16);
  assert.equal((html.match(/>BEST BEFORE</g) || []).length, 16);
  assert.equal((html.match(/>29\/02\/2028</g) || []).length, 16);
  assert(!html.includes("SHOULD NOT PRINT"));
  assert(!html.includes('class="label frame"'));
  assert(!html.includes("<svg"));
  project.items[0].bestBefore = "2027-02-29";
  assert.throws(() => validateHome(project));
});

test("edge-to-edge sheets allow positive and negative printer offsets without losing the preview", () => {
  const p = newHome();
  p.paper = structuredClone(papers.find((p) => p.id === "a4-24")!);
  p.items = [{ id: "a", name: "Salt", second: "", quantity: 1 }];
  for (const offsetX of [-0.1, 0.1]) {
    const moved = { ...p, offsetX };
    assert.equal(placements(moved)[0][0].x, offsetX);
    const preview = documentHTML(moved, false, { guides: true });
    assert(preview.includes(`left:${offsetX}mm`));
    assert(preview.includes('class="guide preview-guide" style="left:0mm'));
  }
});
