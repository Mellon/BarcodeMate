import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
  session,
  Menu,
  clipboard,
  nativeImage,
  ClipboardItem,
} from "electron";
import { readFile, writeFile, rename, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateProject, type Project } from "../src/core/model";
let main: BrowserWindow;
let saving = Promise.resolve();
const root = path.join(__dirname, "../dist");
const testMode = !!process.env.BARCODEMATE_TEST_DIR;
if (testMode) app.setPath("userData", process.env.BARCODEMATE_TEST_DIR!);
protocol.registerSchemesAsPrivileged([
  {
    scheme: "barcodemate",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
const dataFile = (name: string) => path.join(app.getPath("userData"), name);
async function atomic(file: string, data: string | Buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = file + `.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, data, { mode: 0o600 });
  await rename(temp, file);
}
function safeHandler(name: string, callback: (...args: any[]) => unknown) {
  ipcMain.handle(name, (event, ...args) => {
    if (
      event.sender !== main.webContents ||
      event.senderFrame?.url !== "barcodemate://app/index.html"
    )
      throw Error("Untrusted request.");
    return callback(...args);
  });
}
async function readJSON(file: string) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
function secureWindow(options: Electron.BrowserWindowConstructorOptions = {}) {
  const w = new BrowserWindow({
    ...options,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      ...options.webPreferences,
    },
  });
  w.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  w.webContents.on("will-navigate", (e) => e.preventDefault());
  w.webContents.on("will-attach-webview", (e) => e.preventDefault());
  return w;
}
app.whenReady().then(async () => {
  protocol.handle("barcodemate", async (request) => {
    const u = new URL(request.url);
    if (u.hostname !== "app") return new Response("Not found", { status: 404 });
    let decoded: string;
    try {
      decoded = decodeURIComponent(u.pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    const target = path.resolve(root, "." + decoded);
    if (!target.startsWith(root + path.sep))
      return new Response("Forbidden", { status: 403 });
    try {
      const mime: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".wasm": "application/wasm",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8",
        ".map": "application/json",
      };
      return new Response(new Uint8Array(await readFile(target)), {
        headers: {
          "Content-Type":
            mime[path.extname(target)] || "application/octet-stream",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler((_w, _p, callback) =>
    callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
    callback({
      cancel: !/^(barcodemate:|data:|blob:|devtools:)/.test(details.url),
    }),
  );
  main = secureWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: "BarcodeMate",
    backgroundColor: "#f5f7fb",
    show: false,
    autoHideMenuBar: process.platform === "win32",
  });
  main.once("ready-to-show", () => main.show());
  const action = (id: string) => () => main.webContents.send("menu", id);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin"
        ? [
            {
              label: "BarcodeMate",
              submenu: [
                { role: "about" as const },
                { type: "separator" as const },
                { role: "hide" as const },
                { role: "quit" as const },
              ],
            },
          ]
        : []),
      {
        label: "File",
        submenu: [
          {
            label: "New project",
            accelerator: "CmdOrCtrl+N",
            click: action("new"),
          },
          {
            label: "Open project…",
            accelerator: "CmdOrCtrl+O",
            click: action("open"),
          },
          {
            label: "Save project…",
            accelerator: "CmdOrCtrl+S",
            click: action("save"),
          },
          { type: "separator" },
          {
            label: "Import data…",
            accelerator: "CmdOrCtrl+I",
            click: action("import"),
          },
          {
            label: "Print labels…",
            accelerator: "CmdOrCtrl+P",
            click: action("print"),
          },
          ...(process.platform === "darwin" ? [] : [{ role: "quit" as const }]),
        ],
      },
      {
        label: "Edit",
        submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", click: action("undo") },
          {
            label: "Redo",
            accelerator: "CmdOrCtrl+Shift+Z",
            click: action("redo"),
          },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" },
        ],
      },
    ]),
  );
  safeHandler("info", () => ({
    platform: process.platform,
    version: app.getVersion(),
    locale: app.getLocale(),
    dataPath: app.getPath("userData"),
  }));
  safeHandler("project:open", async () => {
    const res = await dialog.showOpenDialog(main, {
      filters: [
        { name: "BarcodeMate project", extensions: ["barcodemate", "json"] },
      ],
      properties: ["openFile"],
    });
    if (res.canceled) return null;
    const file = res.filePaths[0];
    if ((await stat(file)).size > 25_000_000)
      throw Error("Project exceeds 25 MB.");
    return {
      project: validateProject(await readJSON(file)),
      name: path.basename(file),
    };
  });
  safeHandler("project:save", async (value: unknown) => {
    const project = validateProject(value);
    const res = await dialog.showSaveDialog(main, {
      defaultPath: project.name.replace(/[<>:"/\\|?*]/g, "-") + ".barcodemate",
      filters: [{ name: "BarcodeMate project", extensions: ["barcodemate"] }],
    });
    if (res.canceled || !res.filePath) return null;
    await atomic(res.filePath, JSON.stringify(project, null, 2));
    return path.basename(res.filePath);
  });
  safeHandler("library:load", async () => {
    const data = await readJSON(dataFile("library.json"));
    if (!data) return [];
    if (!Array.isArray(data)) throw Error("Library could not be read.");
    return data.map(validateProject);
  });
  safeHandler("library:save", async (values: unknown) => {
    if (!Array.isArray(values) || values.length > 10000)
      throw Error("Invalid project library.");
    const projects = values.map(validateProject);
    await atomic(dataFile("library.json"), JSON.stringify(projects));
  });
  safeHandler("recover", async () => {
    const p = await readJSON(dataFile("recovery.json"));
    return p ? validateProject(p) : null;
  });
  safeHandler("autosave", (value: unknown) => {
    const p = validateProject(value);
    saving = saving
      .catch(() => {})
      .then(() => atomic(dataFile("recovery.json"), JSON.stringify(p)));
    return saving;
  });
  safeHandler("table:import", async () => {
    const res = await dialog.showOpenDialog(main, {
      filters: [
        { name: "CSV / TSV / text", extensions: ["csv", "tsv", "txt"] },
      ],
      properties: ["openFile"],
    });
    if (res.canceled) return null;
    const file = res.filePaths[0];
    if ((await stat(file)).size > 20_000_000)
      throw Error("Import limit is 20 MB.");
    const bytes = await readFile(file);
    const text =
      bytes[0] === 255 && bytes[1] === 254
        ? new TextDecoder("utf-16le").decode(bytes)
        : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { name: path.basename(file), text };
  });
  safeHandler(
    "file:save",
    async (p: { name: string; bytes: Uint8Array; extension: string }) => {
      if (
        !p ||
        ![
          "svg",
          "png",
          "jpeg",
          "jpg",
          "gif",
          "bmp",
          "tiff",
          "pdf",
          "zip",
          "csv",
        ].includes(p.extension) ||
        !(p.bytes instanceof Uint8Array) ||
        p.bytes.length > 256_000_000 ||
        typeof p.name !== "string"
      )
        throw Error("Invalid export.");
      const res = await dialog.showSaveDialog(main, {
        defaultPath: path.basename(p.name),
        filters: [
          { name: p.extension.toUpperCase(), extensions: [p.extension] },
        ],
      });
      if (res.canceled || !res.filePath) return null;
      await atomic(res.filePath, Buffer.from(p.bytes));
      return path.basename(res.filePath);
    },
  );
  safeHandler("clipboard:text", (text: string) => {
    if (typeof text !== "string" || text.length > 100000)
      throw Error("Invalid text.");
    return clipboard.writeText(text);
  });
  safeHandler("clipboard:image", (bytes: Uint8Array) => {
    if (!(bytes instanceof Uint8Array) || bytes.length > 40_000_000)
      throw Error("Invalid clipboard image.");
    const img = nativeImage.createFromBuffer(Buffer.from(bytes));
    if (img.isEmpty()) throw Error("Invalid image.");
    return clipboard.write([
      new ClipboardItem({
        "image/png": new Blob([new Uint8Array(img.toPNG())], {
          type: "image/png",
        }),
      }),
    ]);
  });
  safeHandler(
    "print",
    async (p: {
      html: string;
      width: number;
      height: number;
      pdf: boolean;
      name: string;
    }) => {
      if (
        !p ||
        typeof p.html !== "string" ||
        p.html.length > 100_000_000 ||
        !Number.isFinite(p.width) ||
        !Number.isFinite(p.height) ||
        p.width < 5 ||
        p.width > 1500 ||
        p.height < 5 ||
        p.height > 1500
      )
        throw Error("Invalid print document.");
      // The print renderer has no preload, no Node, no JavaScript and no network access.
      const w = secureWindow({
        show: false,
        webPreferences: {
          preload: undefined,
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          javascript: false,
        },
      });
      try {
        await w.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(p.html),
        );
        if (p.pdf) {
          const out = await w.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          });
          const res = await dialog.showSaveDialog(main, {
            defaultPath: path.basename(p.name) + ".pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          });
          if (res.canceled || !res.filePath) return null;
          await atomic(res.filePath, out);
          return path.basename(res.filePath);
        }
        return await new Promise<string | null>((resolve, reject) =>
          w.webContents.print(
            {
              silent: false,
              printBackground: true,
              margins: { marginType: "none" },
              pageSize: {
                width: Math.round(p.width * 1000),
                height: Math.round(p.height * 1000),
              },
            },
            (ok, error) =>
              ok
                ? resolve("printed")
                : error === "cancelled"
                  ? resolve(null)
                  : reject(Error(error)),
          ),
        );
      } finally {
        w.destroy();
      }
    },
  );
  await main.loadURL("barcodemate://app/index.html");
  app.on("activate", () => {
    if (main && !main.isDestroyed()) main.show();
  });
});
app.on("window-all-closed", () => app.quit());
