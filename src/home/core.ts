import { homeLanguages } from "./i18n";
import { marketsForLanguage, paperFamily } from "./regional";
export interface Paper {
  id: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  left: number;
  top: number;
  gapX: number;
  gapY: number;
  shape: "rectangle" | "round";
  regions: string[];
}
export interface HomeItem {
  id: string;
  name: string;
  second: string;
  // Preserve the badge's identity and catalogue position when its name is edited.
  originalName?: string;
  quantity: number;
  // Presence selects the English pantry label; an empty date stays blank.
  bestBefore?: string;
  bestBeforeBadge?: string;
}
export interface KitchenDate {
  id: string;
  date: string;
}
export interface HomeProject {
  schema: "barcodemate-home-1";
  items: HomeItem[];
  labelSets?: Partial<Record<string, HomeItem[]>>;
  categorySets?: Partial<Record<string, Partial<Record<"kitchen" | "boxes", HomeItem[]>>>>;
  activeGroup?: 0 | 1;
  presetGroups?: Partial<Record<string, number[]>>;
  uiLanguage?: string;
  paper: Paper;
  region: string;
  outputLanguage: string;
  bilingual: boolean;
  kitchenDate?: string; // Legacy bulk date, read only for migration.
  kitchenDates?: KitchenDate[];
  selectedKitchenDate?: string;
  style: "simple" | "frame";
  offsetX: number;
  offsetY: number;
}
const a4 = {
  pageWidth: 210,
  pageHeight: 297,
  shape: "rectangle" as const,
  regions: [] as string[],
};
// Generic dimensions are not manufacturer compatibility claims. Only the A4-21
// preset uses a complete sourced layout (TownStix A4-21).
export const papers: Paper[] = [
  {
    ...a4,
    id: "a4-21",
    name: "A4 · 63.5 × 38.1 mm · 21",
    width: 63.5,
    height: 38.1,
    columns: 3,
    rows: 7,
    left: 7.25,
    top: 15.15,
    gapX: 2.5,
    gapY: 0,
    regions: ["GB"],
  },
  {
    id: "letter-30",
    name: "Letter · 66.675 × 25.4 mm · 30",
    pageWidth: 215.9,
    pageHeight: 279.4,
    width: 66.675,
    height: 25.4,
    columns: 3,
    rows: 10,
    left: 4.7625,
    top: 12.7,
    gapX: 3.175,
    gapY: 0,
    shape: "rectangle",
    regions: ["CA", "US", "MX"],
  },
  {
    ...a4,
    id: "a4-24",
    name: "A4 · 70 × 37 mm · 24",
    width: 70,
    height: 37,
    columns: 3,
    rows: 8,
    left: 0,
    top: 0.5,
    gapX: 0,
    gapY: 0,
  },
  {
    ...a4,
    id: "a4-24-64",
    name: "A4 · 64 × 34 mm · 24",
    width: 64,
    height: 34,
    columns: 3,
    rows: 8,
    left: 7,
    top: 12.5,
    gapX: 2,
    gapY: 0,
    regions: ["KR", "IN"],
  },
  {
    ...a4,
    id: "a4-box",
    name: "A4 · 99 × 67.7 mm · 8",
    width: 99,
    height: 67.7,
    columns: 2,
    rows: 4,
    left: 4.65,
    top: 13.1,
    gapX: 2.7,
    gapY: 0,
  },
  {
    ...a4,
    id: "a4-round",
    name: "A4 · ⌀ 40 mm · 24",
    width: 40,
    height: 40,
    columns: 4,
    rows: 6,
    left: 17.5,
    top: 16,
    gapX: 5,
    gapY: 5,
    shape: "round",
  },
];
export function rankedPapers(region: string, language: string): Paper[] {
  // Full catalogue, with region first and the union of language markets second.
  // These are generic layout suggestions, not claims of local stock or compatibility.
  const markets = marketsForLanguage(language);
  const families = new Set(markets.map(paperFamily));
  const score = (p: Paper) => {
    const family = p.id.startsWith("letter-") ? "letter" : "a4";
    return (
      (region && paperFamily(region) === family ? 20 : 0) +
      (region && p.regions.includes(region) ? 4 : 0) +
      (families.has(family) ? 2 : 0) +
      (markets.some((code) => p.regions.includes(code)) ? 1 : 0)
    );
  };
  return [...papers].sort((a, b) => score(b) - score(a));
}
export function validPaper(p: Paper): Paper {
  if (
    !p ||
    typeof p.name !== "string" ||
    typeof p.id !== "string" ||
    !["rectangle", "round"].includes(p.shape)
  )
    throw Error("paper");
  for (const k of ["pageWidth", "pageHeight", "width", "height"] as const)
    if (!Number.isFinite(p[k]) || p[k] < 5 || p[k] > 500) throw Error("paper");
  for (const k of ["left", "top", "gapX", "gapY"] as const)
    if (!Number.isFinite(p[k]) || p[k] < 0 || p[k] > 500) throw Error("paper");
  for (const k of ["columns", "rows"] as const)
    if (!Number.isInteger(p[k]) || p[k] < 1 || p[k] > 50) throw Error("paper");
  if (
    p.left + p.columns * p.width + (p.columns - 1) * p.gapX >
      p.pageWidth + 0.001 ||
    p.top + p.rows * p.height + (p.rows - 1) * p.gapY > p.pageHeight + 0.001
  )
    throw Error("paper");
  if (p.shape === "round" && Math.abs(p.width - p.height) > 0.001)
    throw Error("paper");
  return p;
}
export const englishKitchenNames = [
  "BASIL",
  "PARSLEY",
  "THYME",
  "PEPPER",
  "ROSEMARY",
  "CINNAMON",
  "CURRY",
  "TURMERIC",
  "HONEY",
  "GINGER",
  "OREGANO",
  "CHILLI",
  "CORIANDER",
  "SUGAR",
  "SALT",
  "GARLIC",
] as const;
export function validBestBefore(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function newHome(): HomeProject {
  return {
    schema: "barcodemate-home-1",
    items: [],
    paper: { ...papers[0] },
    region: "",
    outputLanguage: "en",
    bilingual: false,
    style: "simple",
    offsetX: 0,
    offsetY: 0,
  };
}
function validateHomeItems(items: unknown): number {
  if (!Array.isArray(items) || items.length > 200) throw Error("items");
  const ids = new Set();
  let total = 0;
  for (const item of items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 120 ||
      (item.originalName !== undefined &&
        (typeof item.originalName !== "string" ||
          !item.originalName.trim() || item.originalName.length > 120)) ||
      typeof item.second !== "string" ||
      item.second.length > 120 ||
      (item.bestBefore !== undefined && !validBestBefore(item.bestBefore)) ||
      (item.bestBeforeBadge !== undefined &&
        (typeof item.bestBeforeBadge !== "string" ||
          item.bestBeforeBadge.length > 80)) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 0 ||
      item.quantity > 100
    )
      throw Error("items");
    ids.add(item.id);
    total += item.quantity;
  }
  if (total > 500) throw Error("limit");
  return total;
}
export function validateHome(x: unknown): HomeProject {
  const p = x as HomeProject;
  if (
    !p ||
    p.schema !== "barcodemate-home-1" ||
    !Array.isArray(p.items) ||
    p.items.length > 200 ||
    !["simple", "frame"].includes(p.style) ||
    typeof p.bilingual !== "boolean" ||
    typeof p.region !== "string" ||
    p.region.length > 2 ||
    typeof p.outputLanguage !== "string" ||
    p.outputLanguage.length > 20
  )
    throw Error("project");
  if (
    !homeLanguages.includes(p.outputLanguage) ||
    (p.region !== "" && !/^[A-Z]{2}$/.test(p.region))
  )
    throw Error("project");
  if (p.kitchenDate !== undefined && !validBestBefore(p.kitchenDate))
    throw Error("project");
  if (p.kitchenDates !== undefined) {
    if (
      !Array.isArray(p.kitchenDates) ||
      !p.kitchenDates.length ||
      p.kitchenDates.length > 200
    )
      throw Error("dates");
    const ids = new Set<string>();
    for (const badge of p.kitchenDates) {
      if (
        !badge ||
        typeof badge.id !== "string" ||
        !badge.id ||
        badge.id.length > 80 ||
        ids.has(badge.id) ||
        !badge.date ||
        !validBestBefore(badge.date)
      )
        throw Error("dates");
      ids.add(badge.id);
    }
    if (!p.selectedKitchenDate || !ids.has(p.selectedKitchenDate))
      throw Error("dates");
  } else if (p.selectedKitchenDate !== undefined) throw Error("dates");
  validPaper(p.paper);
  if ([p.offsetX, p.offsetY].some((v) => !Number.isFinite(v)))
    throw Error("paper");
  if (p.uiLanguage !== undefined && !homeLanguages.includes(p.uiLanguage))
    throw Error("project");
  if (p.presetGroups !== undefined) {
    if (
      !p.presetGroups ||
      typeof p.presetGroups !== "object" ||
      Array.isArray(p.presetGroups)
    )
      throw Error("project");
    for (const [language, groups] of Object.entries(p.presetGroups)) {
      if (
        !homeLanguages.includes(language) ||
        !Array.isArray(groups) ||
        groups.length > 2 ||
        groups.some((group) => group !== 0 && group !== 1)
      )
        throw Error("project");
    }
  }
  // Offsets shift the ink, not the die-cut paper geometry. Full-width sheets
  // must allow both directions; rendered text bounds are checked before print.
  const total = validateHomeItems(p.items);
  if (p.activeGroup !== undefined && p.activeGroup !== 0 && p.activeGroup !== 1)
    throw Error("project");
  if (p.categorySets !== undefined) {
    if (!p.categorySets || typeof p.categorySets !== "object" || Array.isArray(p.categorySets))
      throw Error("project");
    for (const [language, categories] of Object.entries(p.categorySets)) {
      if (!homeLanguages.includes(language) || !categories || typeof categories !== "object" || Array.isArray(categories))
        throw Error("project");
      for (const [category, items] of Object.entries(categories)) {
        if (category !== "kitchen" && category !== "boxes") throw Error("project");
        validateHomeItems(items);
      }
    }
  }
  if (p.labelSets !== undefined) {
    if (
      !p.labelSets ||
      typeof p.labelSets !== "object" ||
      Array.isArray(p.labelSets)
    )
      throw Error("project");
    for (const [language, items] of Object.entries(p.labelSets)) {
      if (!homeLanguages.includes(language)) throw Error("project");
      validateHomeItems(items);
    }
  }
  if (total > 500 || Math.ceil(total / (p.paper.rows * p.paper.columns)) > 50)
    throw Error("limit");
  return structuredClone(p);
}
export function parseList(text: string): HomeItem[] {
  if (text.length > 10000) throw Error("limit");
  return text
    .split(/[\n,，、;；]+/u)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^(.*?)\s*[x×*]\s*(\d+)\s*$/u);
      const fields = (match ? match[1] : s).split("|").map((x) => x.trim());
      if (fields.length > 2) throw Error("fields");
      const [name, second = ""] = fields;
      return {
        id: crypto.randomUUID(),
        name,
        second,
        quantity: match ? Number(match[2]) : 1,
      };
    });
}
export function placements(p: HomeProject) {
  validateHome(p);
  const flat = p.items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => item),
  );
  const cap = p.paper.columns * p.paper.rows;
  return Array.from({ length: Math.ceil(flat.length / cap) }, (_, page) =>
    flat.slice(page * cap, (page + 1) * cap).map((item, i) => ({
      item,
      x:
        p.paper.left +
        (i % p.paper.columns) * (p.paper.width + p.paper.gapX) +
        p.offsetX,
      y:
        p.paper.top +
        Math.floor(i / p.paper.columns) * (p.paper.height + p.paper.gapY) +
        p.offsetY,
    })),
  );
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
// Conservative font sizing accounts for long names and multi-script text.
export function fontSize(
  name: string,
  second: string,
  paper: Paper,
  bilingual: boolean,
): number {
  const text = bilingual ? name + second : name;
  const chars = [...text].length;
  const safe = paper.shape === "round" ? 0.63 : 0.82;
  const w = paper.width * safe,
    h = paper.height * safe;
  return Math.max(
    6,
    Math.min(
      22,
      (h * 2.8346) / (bilingual ? 4.6 : 3),
      Math.sqrt((w * h * 8) / Math.max(chars, 1)),
    ),
  );
}
export function documentHTML(
  project: HomeProject,
  calibration = false,
  preview?: { guides: boolean },
): string {
  const p = validateHome(project),
    paper = p.paper;
  const pages = placements(p);
  if (!pages.length && !calibration && !preview) throw Error("items");
  const sheets = calibration || !pages.length ? [[]] : pages;
  const screenGuides = preview?.guides
    ? Array.from(
        { length: paper.columns * paper.rows },
        (_, i) =>
          `<div class="guide preview-guide" style="left:${paper.left + (i % paper.columns) * (paper.width + paper.gapX)}mm;top:${paper.top + Math.floor(i / paper.columns) * (paper.height + paper.gapY)}mm"></div>`,
      ).join("")
    : "";
  const body = sheets
    .map((items) => {
      const content = calibration
        ? Array.from(
            { length: paper.columns * paper.rows },
            (_, i) =>
              `<div class="guide" style="left:${paper.left + (i % paper.columns) * (paper.width + paper.gapX) + p.offsetX}mm;top:${paper.top + Math.floor(i / paper.columns) * (paper.height + paper.gapY) + p.offsetY}mm"></div>`,
          ).join("")
        : items
            .map(({ item, x, y }) => {
              const pantry = item.bestBefore !== undefined;
              const date = item.bestBefore
                ? item.bestBefore.split("-").reverse().join("/")
                : "____ / ____ / ______";
              const size = pantry
                ? Math.min(
                    22,
                    (paper.height *
                      (paper.shape === "round" ? 0.63 : 0.82) *
                      2.8346) /
                      3.2,
                    (paper.width *
                      (paper.shape === "round" ? 0.63 : 0.82) *
                      2.8346) /
                      Math.max(item.name.length * 0.9, 1),
                  )
                : fontSize(item.name, item.second, paper, p.bilingual);
              const content = pantry
                ? `<strong dir="auto">${escape(item.name)}</strong><span class="best-before">BEST BEFORE</span><time class="best-before-date"${item.bestBefore ? ` datetime="${item.bestBefore}"` : ""}>${date}</time>`
                : `<strong dir="auto">${escape(item.name)}</strong>${p.bilingual && item.second ? `<span dir="auto">${escape(item.second)}</span>` : ""}`;
              return `<div class="label ${pantry ? "pantry" : p.style}" style="left:${x}mm;top:${y}mm;font-size:${size}pt"><div class="text">${content}</div></div>`;
            })
            .join("");
      return `<section class="sheet${preview?.guides ? " preview-paper" : ""}">${screenGuides}${content}</section>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>BarcodeMate</title><style>@page{size:${paper.pageWidth}mm ${paper.pageHeight}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#111}body{font-family:Arial,"Noto Sans",sans-serif}.sheet{position:relative;width:${paper.pageWidth}mm;height:${paper.pageHeight}mm;break-after:page;overflow:hidden}.sheet:last-child{break-after:auto}.label,.guide{position:absolute;width:${paper.width}mm;height:${paper.height}mm;border-radius:${paper.shape === "round" ? "50%" : "0"};display:flex;align-items:center;justify-content:center;text-align:center;padding:0}.text{width:${paper.shape === "round" ? 63 : 82}%;max-height:${paper.shape === "round" ? 63 : 85}%;line-height:1.28;overflow-wrap:anywhere}.text strong{display:block;font-weight:600}.text span{display:block;font-size:.7em;margin-top:.3em}.frame .text{border-top:.25mm solid #555;border-bottom:.25mm solid #555;padding:1.3mm 0}.pantry .text{border:0;padding:0;line-height:1.15}.pantry strong{white-space:nowrap;font-family:Georgia,"Times New Roman",serif;font-weight:700}.pantry .best-before{font-size:.34em;letter-spacing:.14em;margin-top:.7em;line-height:1.3}.pantry .best-before-date{display:block;font-size:.38em;letter-spacing:.07em;margin-top:.2em;line-height:1.3}.guide{border:.2mm dashed #999}.preview-paper{background:#b8c3bd}.preview-guide{border:0;background:transparent;pointer-events:none}.preview-guide::after{content:"";position:absolute;inset:.25mm;background:var(--label-surface,#fff);border-radius:inherit;pointer-events:none}@media print{.preview-guide{display:none}.preview-paper{background:white}}.sheet{print-color-adjust:exact}</style></head><body>${body}</body></html>`;
}
