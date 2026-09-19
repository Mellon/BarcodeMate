import type { Paper } from "./core";

// Screen-only stock presentation. Each print page keeps its configured height and grid.
export function rollPreview(
  paper: Paper,
  pages: string[][],
  guides: string,
  start: number,
) {
  const step =
    paper.rows > 1 || paper.pageHeight > 100
      ? 1
      : Math.min(
          4,
          Math.max(2, Math.floor(100 / (paper.pageHeight + paper.gapY))),
        );
  const stockHeight = step * paper.pageHeight + (step - 1) * paper.gapY;
  const displayWidth = paper.pageWidth,
    displayHeight = stockHeight;
  const sections = Array.from(
    { length: step },
    (_, i) =>
      `<section class="sheet" data-roll-row="${start + i + 1}"${start + i >= pages.length ? ' data-unused="true"' : ""}>${guides}${(pages[start + i] || []).join("")}</section>`,
  ).join("");
  const html = `<div class="roll-stage"><div class="roll-stock">${sections}</div></div>`;
  const css = `
html,body{background:transparent}
.roll-stage{width:${displayWidth}mm;height:${displayHeight}mm}
.roll-stock{width:${paper.pageWidth}mm;height:${stockHeight}mm;display:flex;flex-direction:column;gap:${paper.gapY}mm;background:#43c4ca}
.roll-stock .sheet{flex:none;background:transparent;break-after:auto}
.roll-stock .guide{background:#fff;border:.15mm solid #8fbfc0;border-radius:1.2mm}
`;
  return {
    html,
    css,
    displayWidth,
    displayHeight,
    previewStep: step,
    rowsShown: Math.min(step, pages.length - start),
  };
}
