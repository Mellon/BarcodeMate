import { validateHome, type HomeItem, type HomeProject } from "./core";
export function labelKey(
  item: Pick<HomeItem, "name" | "originalName" | "second" | "bestBefore" | "bestBeforeBadge">,
) {
  return JSON.stringify([
    (item.originalName ?? item.name).trim().normalize("NFC").toLowerCase(),
    item.second.trim().normalize("NFC"),
    item.bestBefore ?? null,
    item.bestBeforeBadge ?? null,
  ]);
}
export function groupedItems(items: HomeItem[]): HomeItem[] {
  const groups = new Map<string, HomeItem>();
  for (const item of items) {
    const key = labelKey(item),
      prior = groups.get(key);
    if (prior) prior.quantity += item.quantity;
    else groups.set(key, { ...item });
  }
  return [...groups.values()];
}
export function withQuantity(
  project: HomeProject,
  item: HomeItem,
  quantity: number,
): HomeProject {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 500)
    throw Error("quantity");
  const key = labelKey(item),
    items = project.items.filter((i) => labelKey(i) !== key),
    index = project.items.findIndex((i) => labelKey(i) === key);
  const next: HomeItem[] = quantity === 0 ? [{ ...item, quantity: 0 }] : [];
  for (let remaining = quantity; remaining > 0; remaining -= 100)
    next.push({
      ...item,
      id: next.length === 0 && index >= 0 ? item.id : crypto.randomUUID(),
      quantity: Math.min(100, remaining),
    });
  items.splice(
    index < 0 ? items.length : Math.min(index, items.length),
    0,
    ...next,
  );
  return validateHome({ ...project, items });
}

// Quantity controls describe the ingredient, independently of dates on copies.
export function quantityKey(item: Pick<HomeItem, "name" | "originalName" | "second">) {
  return JSON.stringify([
    (item.originalName ?? item.name).trim().normalize("NFC").toLowerCase(),
    item.second.trim().normalize("NFC"),
  ]);
}
export function groupedQuantities(items: HomeItem[]): HomeItem[] {
  const groups = new Map<string, HomeItem>();
  for (const item of items) {
    const key = quantityKey(item),
      prior = groups.get(key);
    if (prior) prior.quantity += item.quantity;
    else groups.set(key, { ...item });
  }
  return [...groups.values()];
}
export function withTotalQuantity(
  project: HomeProject,
  item: HomeItem,
  quantity: number,
): HomeProject {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 500)
    throw Error("quantity");
  const key = quantityKey(item);
  let items = project.items.map((i) => ({ ...i }));
  const matches = items.filter((i) => quantityKey(i) === key);
  const total = matches.reduce((sum, i) => sum + i.quantity, 0);
  if (quantity > total) {
    let remaining = quantity - total;
    // New copies are undated, regardless of the selected date badge.
    const last = matches.at(-1);
    // Revive the retained zero-count copy with its own saved date, never the selected badge's date.
    if (last && total === 0 && last.bestBefore) { last.quantity = 1; remaining--; }
    if (
      last &&
      !last.bestBefore &&
      !last.bestBeforeBadge &&
      last.quantity < 100
    ) {
      const add = Math.min(100 - last.quantity, remaining);
      last.quantity += add;
      remaining -= add;
    }
    for (; remaining > 0; remaining -= 100)
      items.push({
        id: crypto.randomUUID(),
        name: item.name,
        originalName: item.originalName,
        second: item.second,
        bestBefore: "",
        quantity: Math.min(100, remaining),
      });
  } else if (quantity < total) {
    // Remove the last printed copies first; earlier per-copy dates stay intact.
    let remaining = total - quantity;
    for (let index = items.length - 1; index >= 0 && remaining > 0; index--) {
      const entry = items[index];
      if (quantityKey(entry) !== key) continue;
      const remove = Math.min(remaining, entry.quantity);
      entry.quantity -= remove;
      remaining -= remove;
    }
    const first = items.findIndex((i) => quantityKey(i) === key);
    items = items.filter((i) => quantityKey(i) !== key || i.quantity > 0);
    if (!quantity)
      items.splice(Math.min(first, items.length), 0, {
        ...matches[0],
        quantity: 0,
      });
  }
  return validateHome({ ...project, items });
}

export function withName(project: HomeProject, item: HomeItem, name: string): HomeProject {
  const nextName = name.trim();
  if (!nextName || nextName.length > 120) throw Error("items");
  const key = quantityKey(item);
  const rename = (entry: HomeItem) => ({
    ...entry, originalName: entry.originalName ?? entry.name, name: nextName,
  });
  const exists = project.items.some(entry => quantityKey(entry) === key);
  return validateHome({
    ...project,
    items: exists
      ? project.items.map(entry => quantityKey(entry) === key ? rename(entry) : entry)
      : [...project.items, rename({ ...item, id: crypto.randomUUID() })],
  });
}
