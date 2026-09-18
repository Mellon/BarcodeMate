import { build } from "esbuild";
import { mkdir, copyFile, cp, writeFile, readFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await mkdir("dist-electron", { recursive: true });
await build({
  entryPoints: [
    "src/renderer/main.tsx",
    "src/renderer/validation-worker.ts",
    "src/renderer/scan-worker.ts",
  ],
  bundle: true,
  platform: "browser",
  format: "esm",
  outdir: "dist",
  minify: true,
  sourcemap: true,
  loader: { ".woff2": "file", ".woff": "file" },
  assetNames: "assets/[name]-[hash]",
});
await build({
  entryPoints: ["electron/main.ts", "electron/preload.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "dist-electron",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  target: "node22",
});
await copyFile("src/renderer/index.html", "dist/index.html");
await copyFile("LICENSE", "dist/LICENSE");
await cp("public", "dist", { recursive: true });
await cp(
  "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm",
  "dist/zxing_reader.wasm",
);
const packages = [
  "@bwip-js/generic",
  "fflate",
  "papaparse",
  "react",
  "react-dom",
  "scheduler",
  "lucide-react",
  "zxing-wasm",
  "gifenc",
  "@fontsource-variable/manrope",
  "@fontsource-variable/dm-sans",
];
let notices = "BarcodeMate third-party notices\n\n";
for (const pkg of packages) {
  for (const file of ["LICENSE", "LICENSE.md", "LICENSE.txt", "OFL.txt"]) {
    try {
      notices += `\n${pkg}\n${await readFile("node_modules/" + pkg + "/" + file, "utf8")}\n`;
      break;
    } catch {}
  }
}
for (const name of ["BWIPP-LICENSE", "ZXING-CPP-LICENSE"]) {
  notices += `\n--- ${name} ---\n${await readFile("vendor-notices/" + name, "utf8")}\n`;
}
await writeFile("dist/THIRD_PARTY_NOTICES.txt", notices);
