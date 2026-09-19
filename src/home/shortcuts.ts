export const shortcutIds = ["home", "warehouse", "supermarket"] as const;
export type ShortcutId = (typeof shortcutIds)[number];
export const SHORTCUT_STORE = "barcodemate.shortcuts.v1";
export const SHORTCUT_EVENT = "barcodemate:shortcuts";
export const shortcutKeys = {
  home: "homeCategory",
  warehouse: "warehouse",
  supermarket: "supermarket",
} as const;
export function validShortcuts(value: unknown): ShortcutId[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((id): id is ShortcutId =>
            shortcutIds.includes(id as ShortcutId),
          ),
        ),
      ]
    : [];
}
let memory: ShortcutId[] = [];
export function readShortcuts(): ShortcutId[] {
  try {
    memory = validShortcuts(
      JSON.parse(localStorage.getItem(SHORTCUT_STORE) || "[]"),
    );
  } catch {
    /* Use session memory when storage is unavailable. */
  }
  return [...memory];
}
export function writeShortcuts(ids: ShortcutId[]) {
  memory = validShortcuts(ids);
  try {
    localStorage.setItem(SHORTCUT_STORE, JSON.stringify(memory));
  } catch {
    /* Still usable in this window. */
  }
  window.dispatchEvent(
    new CustomEvent(SHORTCUT_EVENT, { detail: [...memory] }),
  );
}
