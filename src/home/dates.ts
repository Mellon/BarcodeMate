import {
  validateHome,
  validBestBefore,
  type HomeProject,
  type HomeItem,
  type KitchenDate,
} from "./core";

export const dateHighlightColor = "#276749";
export function sixMonthsFrom(now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(now.getDate(), last));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function initializeDates(
  project: HomeProject,
  now = new Date(),
): HomeProject {
  const dates: KitchenDate[] = project.kitchenDates?.length
    ? project.kitchenDates.map((badge) => ({ ...badge }))
    : [{ id: crypto.randomUUID(), date: sixMonthsFrom(now) }];
  const keepDate = (value: string) => {
    let badge = dates.find((b) => b.date === value);
    if (!badge) {
      badge = { id: crypto.randomUUID(), date: value };
      dates.push(badge);
    }
    return badge;
  };
  if (project.kitchenDate) keepDate(project.kitchenDate);
  const migrate = (items: HomeItem[]) =>
    items.map((item) =>
      item.bestBefore &&
      !dates.some(
        (badge) =>
          badge.id === item.bestBeforeBadge && badge.date === item.bestBefore,
      )
        ? { ...item, bestBeforeBadge: keepDate(item.bestBefore).id }
        : item,
    );
  const items = migrate(project.items);
  const labelSets =
    project.labelSets &&
    Object.fromEntries(
      Object.entries(project.labelSets).map(([lang, items]) => [
        lang,
        migrate(items!),
      ]),
    );
  const categorySets = project.categorySets && Object.fromEntries(
    Object.entries(project.categorySets).map(([lang, categories]) => [lang,
      Object.fromEntries(Object.entries(categories!).map(([category, entries]) => [category, migrate(entries)])),
    ]),
  );
  return validateHome({
    ...project,
    items,
    labelSets,
    categorySets,
    kitchenDates: dates,
    selectedKitchenDate: dates.some((b) => b.id === project.selectedKitchenDate)
      ? project.selectedKitchenDate
      : dates[0].id,
  });
}
export function addDate(project: HomeProject, date: string): HomeProject {
  if (!date || !validBestBefore(date)) throw Error("date");
  const p = initializeDates(project);
  const existing = p.kitchenDates!.find((b) => b.date === date);
  if (existing) return validateHome({ ...p, selectedKitchenDate: existing.id });
  const badge = { id: crypto.randomUUID(), date };
  return validateHome({
    ...p,
    kitchenDates: [...p.kitchenDates!, badge],
    selectedKitchenDate: badge.id,
  });
}
export function applyDate(
  project: HomeProject,
  item: HomeItem,
  copyIndex = 0,
): HomeProject {
  const badge = project.kitchenDates?.find(
    (d) => d.id === project.selectedKitchenDate,
  );
  if (!badge) return project;
  const index = project.items.findIndex((i) => i.id === item.id);
  if (index < 0) throw Error("item");
  const source = project.items[index];
  if (!source.quantity) return project;
  if (
    !Number.isInteger(copyIndex) ||
    copyIndex < 0 ||
    copyIndex >= source.quantity
  )
    throw Error("copy");
  if (source.bestBeforeBadge === badge.id && source.bestBefore === badge.date)
    return project;
  const split: HomeItem[] = [];
  if (copyIndex) split.push({ ...source, quantity: copyIndex });
  split.push({
    ...source,
    id: copyIndex ? crypto.randomUUID() : source.id,
    quantity: 1,
    bestBefore: badge.date,
    bestBeforeBadge: badge.id,
  });
  if (copyIndex < source.quantity - 1)
    split.push({
      ...source,
      id: crypto.randomUUID(),
      quantity: source.quantity - copyIndex - 1,
    });
  const items = [...project.items];
  items.splice(index, 1, ...split);
  return validateHome({ ...project, items });
}
export function hasSelectedDate(project: HomeProject, item: HomeItem) {
  const badge = project.kitchenDates?.find(
    (d) => d.id === project.selectedKitchenDate,
  );
  return (
    !!badge &&
    item.bestBeforeBadge === badge.id &&
    item.bestBefore === badge.date
  );
}
