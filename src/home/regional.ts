import timezones from "./timezone-regions.json";

// Language-related markets are ranking hints, never an inference of nationality or location.
export const languageMarkets: Record<string, string[]> = {
  en: ["US", "GB", "CA", "AU", "NZ", "IE", "SG", "IN"],
  "zh-Hans": ["CN", "SG", "MY", "TW", "HK", "MO"],
  "zh-Hant": ["TW", "HK", "MO"],
  es: ["ES", "MX", "AR", "CO", "CL", "PE", "US"],
  fr: ["FR", "CA", "BE", "CH", "LU"],
  de: ["DE", "AT", "CH"],
  pt: ["BR", "PT"],
  ja: ["JP"],
  ko: ["KR"],
  it: ["IT", "CH"],
  ru: ["RU", "KZ"],
  ar: ["SA", "AE", "EG", "MA", "DZ", "JO", "QA", "KW"],
  hi: ["IN"],
  id: ["ID"],
  tr: ["TR"],
  vi: ["VN"],
  th: ["TH"],
  pl: ["PL"],
  nl: ["NL", "BE"],
  uk: ["UA"],
  ms: ["MY", "SG", "BN"],
  bn: ["BD", "IN"],
  fa: ["IR", "AF"],
  he: ["IL"],
};

export const regionCodes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

export function marketsForLanguage(language: string): string[] {
  try {
    const locale = new Intl.Locale(language);
    if (locale.language === "zh")
      return languageMarkets[
        locale.script === "Hant" ||
        ["TW", "HK", "MO"].includes(locale.region || "")
          ? "zh-Hant"
          : "zh-Hans"
      ];
    return languageMarkets[locale.language] || [];
  } catch {
    return [];
  }
}

// Source: the public-domain IANA tzdb zone.tab shipped with macOS, 2026-09-18.
// A chosen system timezone is only a suggestion; it does not establish physical location.
export function countryForTimeZone(zone: string): string {
  try {
    const canonical = new Intl.DateTimeFormat("en", {
      timeZone: zone,
    }).resolvedOptions().timeZone;
    return (
      (timezones as Record<string, string>)[canonical] ||
      (timezones as Record<string, string>)[zone] ||
      ""
    );
  } catch {
    return "";
  }
}

export function regionChoices(
  selected: string,
  detected: string,
  timezone: string,
  language: string,
  browserLanguages: readonly string[] = [],
) {
  const localeRegions = browserLanguages.flatMap((value) => {
    try {
      return new Intl.Locale(value).region || [];
    } catch {
      return [];
    }
  });
  const suggested = [
    ...new Set([
      selected,
      detected,
      timezone,
      ...marketsForLanguage(language),
      ...localeRegions,
    ]),
  ].filter((code) => regionCodes.includes(code));
  const names = new Intl.DisplayNames([language], { type: "region" });
  const collator = new Intl.Collator(language);
  const remaining = regionCodes
    .filter((code) => !suggested.includes(code))
    .sort((a, b) => collator.compare(names.of(a) || a, names.of(b) || b));
  return { suggested, remaining };
}

export function paperFamily(region: string): "a4" | "letter" {
  return ["CA", "US", "MX", "PH"].includes(region) ? "letter" : "a4";
}
