import messages from "./messages.json";
import words from "./words.json";
export type HomeKey = keyof typeof messages.en;
export const homeLanguages = Object.keys(messages);
export function text(language: string, key: HomeKey) {
  return (messages[language as keyof typeof messages] || messages.en)[key];
}
export function names(language: string) {
  return words[language as keyof typeof words] || words.en;
}
export function isRTL(language: string) {
  return ["ar", "fa", "he"].includes(language);
}
