import {
  englishKitchenNames,
  validateHome,
  type HomeItem,
  type HomeProject,
} from "./core";
import { names, homeLanguages } from "./i18n";
import { initializeDates } from "./dates";
import kitchenPresets from "./kitchen-presets.json";

// Curated starter suggestions, not a popularity ranking. See docs/kitchen-presets-research.md.
export function presetItems(project: HomeProject, group: number): HomeItem[] {
  const language = project.outputLanguage;
  if (group === 0) {
    const entries =
      kitchenPresets[language as keyof typeof kitchenPresets] ||
      kitchenPresets.en;
    return entries.map(({ name, english }) => ({
      id: "preset-" + name,
      name,
      second: language === "en" ? "" : english,
      quantity: 1,
      ...(language === "en" ? { bestBefore: "" } : {}),
    }));
  }
  return names(language)
    .slice(8, 16)
    .map((name, i) => ({
      id: "preset-" + name,
      name,
      second: language === "en" ? "" : names("en")[i + 8],
      quantity: 1,
    }));
}

export function activateLabelSet(
  project: HomeProject,
  language: string,
  group: number,
): HomeProject {
  if (!homeLanguages.includes(language) || ![0, 1].includes(group))
    throw Error("project");
  const sets = structuredClone(project.labelSets || {});
  const initialized = structuredClone(project.presetGroups || {});
  let current = project.items.map((item) => ({ ...item }));
  // One-time recovery of the old shared workspace. Recognized foreign presets
  // move to their own language; unrecognized custom text is never translated.
  const recoverEnglish = (input: HomeItem[]) => {
    const english = new Set(
      [...names("en"), ...englishKitchenNames].map((n) => n.toLowerCase()),
    );
    return input
      .filter((item) => {
        if (english.has(item.name.toLowerCase())) return true;
        const source = homeLanguages.find(
          (code) => code !== "en" && names(code).includes(item.name),
        );
        if (!source) return true;
        if (!(sets[source] || []).some((saved) => saved.id === item.id))
          sets[source] = [...(sets[source] || []), { ...item }];
        return false;
      })
      .map((item) =>
        englishKitchenNames.some((n) => n === item.name.toUpperCase())
          ? {
              ...item,
              name: item.name.toUpperCase(),
              second: "",
              bestBefore: item.bestBefore ?? project.kitchenDate ?? "",
            }
          : item,
      );
  };
  if (project.outputLanguage === "en" && !initialized.en)
    current = recoverEnglish(current);
  sets[project.outputLanguage] = current;
  if (language === "en" && !initialized.en && language !== project.outputLanguage)
    sets.en = recoverEnglish(sets.en || []);
  const categorySets: NonNullable<HomeProject["categorySets"]> = structuredClone(project.categorySets || {});
  const category = group === 0 ? "kitchen" : "boxes";
  if (!project.categorySets) {
    // Split legacy mixed lists once. originalName identifies renamed presets;
    // unknown custom labels stay in Kitchen, never discarded or duplicated.
    for (const [lang, entries] of Object.entries(sets)) {
      const storageNames = new Set(names(lang).slice(8, 16).map(name => name.trim().normalize("NFC").toLowerCase()));
      const kitchen: HomeItem[] = [], boxes: HomeItem[] = [];
      for (const item of entries || []) {
        const name = (item.originalName ?? item.name).trim().normalize("NFC").toLowerCase();
        (storageNames.has(name) ? boxes : kitchen).push({ ...item });
      }
      categorySets[lang] = { kitchen, boxes };
    }
  } else {
    const source = categorySets[project.outputLanguage] ||= {};
    source[project.activeGroup === 1 ? "boxes" : "kitchen"] = current;
  }
  const items = (categorySets[language]?.[category] || []).map(item => ({ ...item }));
  const next = {
    ...project,
    outputLanguage: language,
    items,
    labelSets: undefined,
    categorySets,
    activeGroup: group as 0 | 1,
    presetGroups: initialized,
  };
  // Seed each language/category only once. Later catalogue changes must never
  // reset a user's zero quantities or silently add labels to a saved print job.
  if (!(initialized[language] || []).includes(group)) {
    let room =
      Math.min(500, project.paper.rows * project.paper.columns * 50) -
      items.reduce((sum, item) => sum + item.quantity, 0);
    for (const preset of presetItems(next, group)) {
      if (items.some((item) => samePreset(item, preset))) continue;
      if (items.length >= 200) break;
      items.push({
        ...preset,
        id: crypto.randomUUID(),
        quantity: room > 0 ? 1 : 0,
      });
      room--;
    }
    initialized[language] = [...(initialized[language] || []), group];
  }
  (categorySets[language] ||= {})[category] = items.map((item) => ({ ...item }));
  const result = initializeDates(validateHome(next));
  delete result.labelSets;
  return result;
}

export function samePreset(a: HomeItem, b: HomeItem) {
  return (
    (a.originalName ?? a.name).trim().normalize("NFC").toLowerCase() ===
      (b.originalName ?? b.name).trim().normalize("NFC").toLowerCase() &&
    a.second.trim() === b.second.trim()
  );
}
