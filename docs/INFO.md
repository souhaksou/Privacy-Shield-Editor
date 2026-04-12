# Privacy-Shield-Editor — INFO

## Project Overview

Privacy-Shield-Editor is a pure frontend OCR-based document processing tool.

Core idea:

- User uploads an image
- App runs OCR in browser
- User can review / correct OCR result
- User may optionally enable PII masking
- User exports final output as image or PDF

All processing must stay client-side.

---

## Core Workflow

This project uses a single pipeline:

1. Upload image
2. OCR recognition
3. OCR result review / manual correction
4. Optional PII masking
5. Export as image or PDF

Important:

- OCR is the core step
- PII is optional post-processing
- Export happens last

This project is NOT designed as multiple parallel modes.

---

## Tech Stack

- Vite
- Vue 3 (Composition API)
- TypeScript
- PrimeVue
- TailwindCSS
- Pinia
- Tesseract.js
- uuid (client-side mask entry ids)
- pdf-lib
- Canvas API
- Web Worker

---

## Architecture

### Layering

The project should follow these layers:

#### 1. core/

Pure logic only.
No Vue.
No DOM.
Handles:

- OCR text normalization
- regex-based PII detection
- mask calculation
- export helpers (including shared mask painting onto a 2D bitmap for consistency with preview)
- PDF generation

#### 2. composables/

Vue logic layer.
Handles:

- OCR execution
- canvas state / interaction
- export flow
- mask control

#### 3. components/

UI only.
Should not contain business logic.

#### 4. workers/

OCR worker only.

#### 5. stores/

Pinia state management.

---

## State Design

### document store

Core document data:

- uploaded image metadata
- OCR result
- mask rectangles: geometry in image pixel space (`x`, `y`, `width`, `height`), source (`auto` / `manual`), per-rect **`fillColor` / `strokeColor`** (CSS color strings; defaults applied when missing or blank), and a **stable client-side `id`** (string UUID, e.g. v4 via the `uuid` package) so lists can use `:key`, and add / remove / in-place edit target the same logical mask without relying on array index; **`id` is not written into exported PNG/PDF**
- export-related derived state

### editor store

UI state:

- OCR / export loading and mutual exclusion (`isOcrLoading`, `isExporting`)
- OCR progress, status line, last error; export last error
- **OCR languages (UI):** booleans for including English (`eng`) and Traditional Chinese (`chi_tra`); a computed **`ocrLang`** string sent to the worker (`eng`, `chi_tra`, or `eng+chi_tra` in fixed order). At least one language must remain selected to run OCR.
- layout polish does not require new global “mode” flags in this store beyond what the OCR flow needs

---

## Canvas Design

Three-layer canvas architecture:

1. baseCanvas

- Draws original image only

2. maskCanvas

- Draws committed mask rectangles for preview
- Uses the same per-rect fill/stroke resolution and draw routine as the off-screen mask layer used in export (`paintMaskRectsOnBitmap` in `src/core/export/maskCanvas.ts`) so preview colors match PNG/PDF output

3. uiCanvas

- Interaction-only: new rectangle drag, hit-testing on existing masks, drag-to-move, corner resize handles, and selection chrome
- brush preview is not implemented yet (reserved for a future optional phase)

Rules:

- baseCanvas should not be modified by masking logic
- uiCanvas should not be included in final export
- export composes **base image + off-screen mask canvas** (same mask paint semantics as preview); uiCanvas is never part of the export bitmap

---

## OCR Design

OCR must run inside Web Worker.

Expected OCR result should include:

- text
- word-level bounding boxes
- optional line-level grouping if needed

OCR is the primary engine for:

- text review
- PII detection
- possible text-layer PDF export

The worker receives a single `lang` string (e.g. `eng+chi_tra`) derived from editor store checkboxes; switching combination may reload/rebuild the Tesseract worker for that language set.

---

## PII Design

PII detection is optional and happens after OCR.

Detection method:

- regex-based
- operates on OCR text result
- maps matches back to OCR bounding boxes

Default PII types:

- email
- phone
- credit card

Mask appearance:

- each `MaskRect` has **`fillColor`** and **`strokeColor`** (user-editable in the PII panel and reflected on canvas preview and export)
- built-in defaults (e.g. solid fill + stroke) apply when values are omitted or blank strings

Manual editing should allow:

- add mask (canvas drag and/or panel actions)
- remove mask
- in-place geometry updates (canvas move/resize and/or numeric fields)
- optional brush masking later

Mask edits should identify rows by **`id`** (not list index) when removing or updating geometry or colors in place; the **`id` stays the same** for the same logical mask unless the UI discards and recreates that entry.

---

## Export Design

### Image Export

- combine base image with an off-screen mask layer built from current `MaskRect[]` using the same paint path as preview `maskCanvas`
- exclude uiCanvas

### PDF Export

- use pdf-lib
- first version can be image-based PDF
- optional basic OCR text layer
- no need for perfect layout reconstruction

---

## File / Module Expectations

Suggested structure:

- src/core/
- src/composables/
- src/components/
- src/workers/
- src/stores/
- src/types/

Keep business logic out of components.

---

## Development Phases

### Phase 1

OCR core

- image upload
- OCR worker
- OCR result display
- manual correction

### Phase 2

Export

- image export
- PDF export

### Phase 3

PII

- regex detection
- auto mask generation
- manual mask editing

### Phase 4

Canvas full workflow

- complete baseCanvas / maskCanvas / uiCanvas interaction flow
- keep export output as base + mask only (off-screen mask for export)
- keep uiCanvas as interaction-only layer (excluded from export)

### Phase 5

UI + canvas polish (completed)

- OCR language multi-select (`eng` / `chi_tra`) with composed `lang` string
- canvas hit-test: move and corner-resize existing masks; geometry clamped to image bounds
- per-mask fill/stroke colors in UI; preview and export share one mask paint implementation
- OCR flow page layout: workbench / step panels, spacing and visual hierarchy (`OcrFlowView`, related OCR subcomponents)

Do not implement all phases at once.

---

## Constraints

- No backend
- No server upload
- No heavy libraries unless absolutely necessary
- Avoid over-engineering
- Prefer simple, localized changes
