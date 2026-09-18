import { encode } from "../core/barcode";
import type { Design, Row } from "../core/model";
let generation = 0;
self.onmessage = async (
  event: MessageEvent<{ design: Design; rows: Row[] }>,
) => {
  const current = ++generation;
  const { design, rows } = event.data;
  const statuses: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (current !== generation) return;
    const row = rows[i];
    try {
      if (
        !Number.isInteger(row.quantity) ||
        row.quantity < 1 ||
        row.quantity > 10000
      )
        throw Error("Copies must be an integer from 1 to 10,000.");
      encode({
        ...design,
        data: row.data,
        type: row.type || design.type,
        captionAbove: row.captionAbove || design.captionAbove,
        captionBelow: row.captionBelow || design.captionBelow,
      });
      statuses.push("");
    } catch (e) {
      statuses.push(e instanceof Error ? e.message : String(e));
    }
    if (i % 50 === 49) {
      self.postMessage({ statuses: [...statuses], done: false });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  if (current === generation) self.postMessage({ statuses, done: true });
};
