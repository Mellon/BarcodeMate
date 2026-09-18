import d0 from "./en.json" with { type: "json" };
import d1 from "./zh-Hans.json" with { type: "json" };
import d2 from "./zh-Hant.json" with { type: "json" };
import d3 from "./es.json" with { type: "json" };
import d4 from "./fr.json" with { type: "json" };
import d5 from "./de.json" with { type: "json" };
import d6 from "./pt.json" with { type: "json" };
import d7 from "./ja.json" with { type: "json" };
import d8 from "./ko.json" with { type: "json" };
import d9 from "./it.json" with { type: "json" };
import d10 from "./ru.json" with { type: "json" };
import d11 from "./ar.json" with { type: "json" };
import d12 from "./hi.json" with { type: "json" };
import d13 from "./id.json" with { type: "json" };
import d14 from "./tr.json" with { type: "json" };
import d15 from "./vi.json" with { type: "json" };
import d16 from "./th.json" with { type: "json" };
import d17 from "./pl.json" with { type: "json" };
import d18 from "./nl.json" with { type: "json" };
import d19 from "./uk.json" with { type: "json" };
import d20 from "./ms.json" with { type: "json" };
import d21 from "./bn.json" with { type: "json" };
import d22 from "./fa.json" with { type: "json" };
import d23 from "./he.json" with { type: "json" };
import languageList from "./languages.json" with { type: "json" };
export const languages = languageList;
export const dictionaries: Record<string, Record<string, string>> = {
  "en": d0,
  "zh-Hans": d1,
  "zh-Hant": d2,
  "es": d3,
  "fr": d4,
  "de": d5,
  "pt": d6,
  "ja": d7,
  "ko": d8,
  "it": d9,
  "ru": d10,
  "ar": d11,
  "hi": d12,
  "id": d13,
  "tr": d14,
  "vi": d15,
  "th": d16,
  "pl": d17,
  "nl": d18,
  "uk": d19,
  "ms": d20,
  "bn": d21,
  "fa": d22,
  "he": d23
};
export function negotiateLanguage(preferences: readonly string[]): string {
  for (const preference of preferences) {
    const tag = preference.toLowerCase().replaceAll("_", "-");
    const exact = languages.find(l => l.code.toLowerCase() === tag);
    if (exact) return exact.code;
    if (tag === "zh" || tag.startsWith("zh-")) {
      return /(?:^|-)hans(?:-|$)/.test(tag) ? "zh-Hans" : /(?:^|-)(hant|tw|hk|mo)(?:-|$)/.test(tag) ? "zh-Hant" : "zh-Hans";
    }
    const base = tag.split("-")[0];
    const alias = base === "iw" ? "he" : base === "in" ? "id" : base;
    if (languages.some(l => l.code === alias)) return alias;
  }
  return "en";
}
export function translate(language: string, source: string, values: Record<string, string | number> = {}): string {
  const translated = dictionaries[language]?.[source] || source;
  // Keep meaningful spacing in existing message prefixes.
  const padded = /\s$/.test(source) && !/\s$/.test(translated) ? translated + " " : translated;
  return padded.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
}
export function direction(language: string) { return languages.find(l => l.code === language)?.direction || "ltr"; }
const templates: [RegExp, string, string[]][] = [
  [/^Enter (\d+) digits, or (\d+) with a check digit\.$/, "Enter {short} digits, or {full} with a check digit.", ["short", "full"]],
  [/^Check digit should be (\d+)\.$/, "Check digit should be {digit}.", ["digit"]],
  [/^Module width aligned to (\d+) printer dots \(([^)]+) mm\)\.$/, "Module width aligned to {dots} printer dots ({width} mm).", ["dots", "width"]],
  [/^Row (\d+): quantity must be an integer from 1 to 10,000\.$/, "Row {number}: quantity must be an integer from 1 to 10,000.", ["number"]],
  [/^“(.+)” is larger than the label at its actual size\. Reduce module width or height, or choose a larger label\.$/s, "“{name}” is larger than the label at its actual size. Reduce module width or height, or choose a larger label.", ["name"]],
];
export function diagnostic(language: string, raw: string): string {
  const text = raw.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "");
  if (!text || language === "en") return text;
  if (Object.values(dictionaries[language] || {}).includes(text)) return text;
  if (dictionaries.en[text]) return translate(language, text);
  for (const [pattern, template, keys] of templates) {
    const match = text.match(pattern);
    if (match) return translate(language, template, Object.fromEntries(keys.map((key,i) => [key, match[i+1]])));
  }
  const row = text.match(/^Row (\d+): (.*)$/s);
  if (row) return translate(language, "Row {number}: {message}", {number: row[1], message: diagnostic(language, row[2])});
  const range = text.match(/^([^:]+): ([\d.]+[–-][\d.]+)$/);
  if (range) {
    const fields: Record<string, string> = {Height:"Bar height", "Font size":"Font size (pt)", "Quiet zone":"Quiet zone · sides", "Bar reduction":"Bar reduction (mm)", "Logo size":"Size & output", Count:"How many?", Padding:"Minimum digits", paperWidth:"Paper width", paperHeight:"Paper height", width:"Label width", height:"Label height", marginX:"Left / right margin", marginY:"Top / bottom margin", gapX:"Horizontal gap", gapY:"Vertical gap"};
    return translate(language, fields[range[1]] || range[1]) + ": " + range[2];
  }
  return translate(language, "Technical details: {detail}", {detail:text});
}
