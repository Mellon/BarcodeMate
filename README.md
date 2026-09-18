# BarcodeMate

A local desktop workspace for barcode design, batch generation, reusable projects and label printing. Built with Electron, React and TypeScript for macOS and Windows.

## Download

[Download for Windows and Mac](https://barcodemate.com/desktop/) · [GitHub release and checksums](https://github.com/Mellon/BarcodeMate/releases/tag/v0.2.0)

Version 0.2.0 provides Windows x64, Mac Apple Silicon and Intel Mac packages. Windows installation and app workflows, plus macOS packaged app workflows, passed automated tests. Intel Mac physical hardware and real printers remain unverified. App interface: 24 languages, automatic system-language selection on first launch, a persistent language selector, and right-to-left layouts for Arabic, Persian and Hebrew.

Installers are not publisher-signed; Mac packages are not notarized. The operating system may warn or block installation. Test a printed sample before a large print run.

## What works

- 108 barcode formats from BWIPP / bwip-js, including retail, GS1, industrial, postal and 2D formats.
- CSV / TSV / text import and pasted spreadsheets with column mapping, leading-zero preservation, per-row quantities, names, formats and captions.
- Exact integer sequences with start, step, count, zero padding, prefix/suffix and shuffled unique values.
- Editable batches, selection, error reporting, pagination, background validation and cancellable ZIP exports.
- Label layouts for A4, US Letter and thermal paper. Custom dimensions, margins, gutters, rows/columns, print order and partially used sheets.
- Real-size label preview, vector PDF export and native printer handoff. Oversized barcodes are flagged instead of silently resized.
- PNG, SVG, JPEG, GIF, BMP and uncompressed RGB TIFF. PNG/JPEG/BMP/TIFF carry physical resolution metadata; GIF has no standard DPI metadata.
- Module width aligned to printer dots, bar height, quiet zones, rotation, colors, captions, text settings and expert encoder options.
- GS1 common-field, Wi-Fi, vCard and URL assistants. Raster logos on selected 2D formats and dot styling where supported.
- Portable `.barcodemate` project files, local project library, recovery autosave and undo/redo.
- Local image decoding via ZXing WASM in a worker; file, drop and paste input. Decoder supports fewer formats than generation.
- 24 interface languages and light/dark themes. No telemetry, account, remote fonts or network uploads.

Generation is not registration of a product number. Design diagnostics are not an ISO/IEC quality grade. Use an actual printed sample and scanner before production.

## Run and validate

Requires Node.js 24+ and npm. Run all commands from the repository root.

```sh
npm ci
npm run build
npm test
npm run test:app
npm start
```

Local data lives in Electron's per-user application-data directory. Use **Save project** to choose a portable project file. The library and recovery data are private to each OS user. Storage errors are surfaced instead of silently discarding data.

## Package locally

```sh
npm run build
npx electron-builder --mac dmg --arm64 --publish never
npx electron-builder --win nsis --x64 --publish never
```

Build Windows on a Windows runner for representative runtime tests. The included workflow only validates and stores CI artifacts; it does not publish releases. Signing/notarization credentials are not configured. Public releases are published separately after package validation and checksum verification.

## Scope and status

- [BCStudio research and comparison](docs/BCSTUDIO_RESEARCH.md)
- [Validation evidence and remaining checks](docs/VALIDATION.md)

This build prioritizes import → sequence → layout → print. It is not yet a complete replacement for every BCStudio professional feature. EPS/AI, CMYK/overprint, specialized assistants and other differences are listed explicitly in the comparison.

## License

BarcodeMate is licensed under the [MIT License](LICENSE). Third-party components retain their respective licenses; their notices are bundled at `THIRD_PARTY_NOTICES.txt`. No proprietary BCStudio components or copied templates are included.

## Interface languages

English, Simplified Chinese, Traditional Chinese, Spanish, French, German, Portuguese, Japanese, Korean, Italian, Russian, Arabic, Hindi, Indonesian, Turkish, Vietnamese, Thai, Polish, Dutch, Ukrainian, Malay, Bengali, Persian and Hebrew.

The language selector is at the bottom of the sidebar. Switching language also updates application menus and keeps your project data, barcodes and print geometry unchanged. Native OS dialogs follow OS settings. Dictionaries ship inside the application; language switching works offline. Technical error details from third-party encoders may retain their original wording. Translation corrections are welcome in `src/i18n/`.
