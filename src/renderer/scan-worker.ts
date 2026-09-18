import { readBarcodes, prepareZXingModule } from "zxing-wasm/reader";
self.onmessage = async (event: MessageEvent<ImageData>) => {
  try {
    await prepareZXingModule({
      overrides: {
        locateFile: () =>
          new URL("/zxing_reader.wasm", self.location.href).href,
      },
    });
    const results = await readBarcodes(event.data, { tryHarder: true });
    self.postMessage({
      results: results.map((r) => ({ format: r.format, text: r.text })),
    });
  } catch (e) {
    self.postMessage({ error: e instanceof Error ? e.message : String(e) });
  }
};
