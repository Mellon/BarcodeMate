# BarcodeMate desktop: local product research

Research date: 2026-09-17. Product name explicitly chosen by the owner: **BarcodeMate**. Priority explicitly chosen: batch import, serial numbers, label layout and printing.

## Reference and method

Inspected the installed `/Applications/BCStudio.app`, identified as TEC-IT Barcode Studio **17.2.1 (32162)**. Read the installed user manual (version 17.1, 13 January 2026, 85 pages), inspected the macOS UI and its public controls. The installed binary is newer than its bundled manual. No proprietary source code, fonts, artwork, templates, license keys or compiled components were copied into BarcodeMate. Local reference screenshots stay in the parent website's private artifacts directory and are not release assets.

Primary public references:

- https://www.tec-it.com/en/software/barcode-software/barcode-creator/barcode-studio/Default.aspx
- https://www.tec-it.com/Download/PDF/Barcode-Studio-17_Manual_EN.pdf
- https://github.com/metafloor/bwip-js
- https://www.electronjs.org/docs/latest/tutorial/security

## Observed workflow and design decisions

Barcode Studio organizes work into Codes, Data List and Labels. Its many precise controls are useful, but the relevant actions are spread among pages and dialogs. BarcodeMate keeps these capabilities in a continuous Design → Batch data → Labels & print workflow. The label renderer preserves physical barcode dimensions instead of silently shrinking a barcode to fit.

The new design uses a stable left navigation, a large independent preview, numbered design steps, a searchable format selector, explicit data status, and light/dark themes. Core controls and application layout are shared across macOS and Windows; the OS print and file dialogs intentionally retain native behavior. Project files include design settings, all data rows, quantities, captions and the complete label layout. Recovery saves and a project library work without accounts.

## Feature comparison and acceptance scope

“Implemented” below describes local code, not a published or fully platform-certified product. Test results are tracked separately in VALIDATION.md. This is not yet a claim of complete BCStudio parity.

| Capability found in BCStudio                     | BarcodeMate implementation                                                                                    | Remaining boundary                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Broad linear, retail, GS1, postal and 2D formats | Reuses the website's 108-format BWIPP catalog                                                                 | Encoder coverage differs from TEC-IT; identical counts do not prove equivalent symbologies   |
| Text/CSV import and field mapping                | UTF-8 / UTF-16LE CSV, TSV and pasted spreadsheet data; data, filename, quantity, format and two captions      | Native XLSX import not implemented; export CSV or paste cells                                |
| Serial numbers, masks, random generation         | BigInt start/step/count, zero padding, prefix/suffix, unique shuffled sequence                                | Arbitrary multi-placeholder masks not yet implemented                                        |
| Editable data list and quantities                | Inline editing, selection, deletion, pagination, validation and per-row errors                                | Full per-row style overrides and composite-data mapping remain                               |
| Batch graphic export                             | SVG, PNG, JPEG, GIF, BMP and TIFF in collision-safe ZIP; cancellation and progress                            | PDF batch is through the label workflow                                                      |
| Label presets and custom pages                   | A4, US Letter and thermal presets; custom size, rows/columns, gaps, margins, used-label offset and fill order | No copy of TEC-IT's proprietary manufacturer/template database                               |
| Label print/export                               | Shared real-size preview, vector PDF, native printer dialog                                                   | Actual printer/scanner and Windows runtime validation remain                                 |
| Fine dimensions and resolution                   | Module width aligned to printer dots, bar height, DPI, quiet zones and rotation                               | Specialized standard-specific dimensional conformance not certified                          |
| Human-readable text and captions                 | Alignment, size, above/below captions, colors                                                                 | BCStudio four-caption configuration and custom font selection remain                         |
| Barcode input assistants                         | GS1 common AIs (01/10/17/21), Wi-Fi, vCard and URL                                                            | Full GS1 AI catalog, GS1 Digital Link, Swiss payment and industry-specific assistants remain |
| Appearance options                               | Colors, dot styling on supported formats, bar reduction, raster logo overlay for select 2D codes              | No guarantee that styled symbols scan; export/print testing required                         |
| Encoder settings                                 | Expert JSON options and byte/escape input                                                                     | Guided format-specific options and complete code-page UI remain                              |
| Quality preview                                  | Contrast/quiet-zone/style diagnostics and printer-dot alignment                                               | Not ISO/IEC quality grading and not a substitute for a verifier                              |
| Project/templates                                | Portable versioned JSON project, library, autosave recovery, undo/redo                                        | Does not read proprietary `.bc` projects                                                     |
| EPS / AI, CMYK and overprint                     | Not implemented                                                                                               | Needed before claiming full professional prepress parity                                     |
| Command-line barcode generation                  | Not implemented                                                                                               | Separate future acceptance item                                                              |
| Image recognition                                | Added local ZXing-WASM decoding, drag/drop and paste                                                          | Recognition covers a subset of generation formats                                            |
| Localized consistent desktop                     | English/Chinese, light/dark, common UI                                                                        | Other website languages not yet carried into desktop                                         |

## Release constraints

The intended repository is `Mellon/BarcodeMate`, under the MIT License. Source publication and an installable, signed public release are separate milestones.

Do not publish downloads until actual release artifacts exist and their platform/signing status is accurately described. A successful local macOS build does not demonstrate a successful Windows installation or cross-platform printer behavior.
