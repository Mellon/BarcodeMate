import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("desktop", {
  security: () => ({
    contextIsolation: process.contextIsolated,
    sandbox: process.sandboxed,
    nodeIntegration: false,
  }),
  info: () => ipcRenderer.invoke("info"),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (p: unknown) => ipcRenderer.invoke("project:save", p),
  loadLibrary: () => ipcRenderer.invoke("library:load"),
  saveLibrary: (p: unknown) => ipcRenderer.invoke("library:save", p),
  recover: () => ipcRenderer.invoke("recover"),
  autosave: (p: unknown) => ipcRenderer.invoke("autosave", p),
  importTable: () => ipcRenderer.invoke("table:import"),
  saveFile: (p: unknown) => ipcRenderer.invoke("file:save", p),
  print: (p: unknown) => ipcRenderer.invoke("print", p),
  clipboardText: (p: unknown) => ipcRenderer.invoke("clipboard:text", p),
  clipboardImage: (p: unknown) => ipcRenderer.invoke("clipboard:image", p),
  menu: (callback: (action: string) => void) => {
    const listener = (_: unknown, action: string) => callback(action);
    ipcRenderer.on("menu", listener);
    return () => ipcRenderer.removeListener("menu", listener);
  },
});
