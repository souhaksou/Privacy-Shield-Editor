# Privacy-Shield-Editor — PROGRESS

## Current Status

Project is in **active maintenance** after Phase 1–5 baselines. Core OCR → optional PII → export pipeline is implemented and polished for layout, mask interaction, per-mask colors, and OCR language selection.

**High-level plan reference:** `.cursor/plans/phase5_ui_canvas_polish_a4c63b3f.plan.md` (UI + canvas polish — **completed**; see Completed below).

---

## Completed

- project direction decided
- workflow clarified as OCR-first pipeline
- decided that PII is optional post-processing
- decided that export happens at the end
- selected tech stack:
  - Vite
  - Vue 3 Composition API
  - TypeScript
  - PrimeVue
  - TailwindCSS
  - Pinia
  - Tesseract.js
  - pdf-lib
- base project scaffold (Vite + Vue + TypeScript)
- base folder structure aligned with docs/INFO.md layering
- Phase 1 OCR core:
  - image upload flow
  - OCR worker implementation
  - OCR result normalization/types
  - document/editor stores wired
  - minimal OCR UI flow (upload → preview → run OCR → text edit)
  - smoke checks passed (type-check + build)
- Phase 2 export core:
  - image export baseline (PNG)
  - PDF export baseline via pdf-lib (image-based)
  - export flow composable + editor export UI state
  - export UI wiring in OCR flow
  - mutual exclusion guards between OCR and export actions
  - performance optimization:
    - route lazy loading for OcrFlowView
    - dynamic import for pdf-lib during PDF export
  - validation passed:
    - type-check passed
    - build passed
    - manual E2E passed (upload → OCR → edit → export PNG/PDF)
- Phase 3 PII masking core:
  - core regex detection baseline completed (email / phone / credit card)
  - mapping completed: PII matches -> OCR word-level bbox groups
  - initial auto mask rectangle generation completed
  - document store mask state completed:
    - maskRects state
    - add/remove/reset operations
    - stable id support for mask entries
  - composable flow completed:
    - usePiiMask wired for detect -> map -> build mask
    - manual add/remove/clear mask actions
  - minimal UI wiring completed:
    - OcrPiiPanel added
    - OcrFlowView event wiring completed
  - export integration completed:
    - masks are applied to PNG export
    - masks are applied to PDF export via shared PNG composition pipeline
  - validation passed:
    - type-check passed
    - build passed
    - manual E2E passed (upload -> OCR -> detect PII -> add/remove mask -> export PNG/PDF)
- Phase 4 canvas full workflow baseline:
  - `OcrCanvasEditor`: three stacked canvases (baseCanvas / maskCanvas / uiCanvas) for preview
  - `useCanvasEditor`: base image draw, mask redraw on store changes, display-to-image coords, ui-layer drag box for manual masks
  - `OcrFlowView`: canvas preview replaces plain `<img>`; `add-mask` wired to `usePiiMask().addMaskRect()`
  - export unchanged: off-screen `useExport` pipeline (base + off-screen mask only; uiCanvas not in export)
  - validation passed:
    - type-check passed
    - build passed
    - ESLint passed (`eslint . --max-warnings 0`)
    - manual E2E passed (upload → OCR → PII detect → canvas box select → export PNG/PDF)
- Phase 5 UI + canvas polish:
  - OCR language: PrimeVue checkboxes for `eng` / `chi_tra`; composed `ocrLang` in editor store; `useOcr` passes string to worker; at least one language required to run
  - `useCanvasEditor`: hit-test on existing masks; drag to move; corner resize; clamp geometry to image bounds; selection handles on uiCanvas
  - mask model: `fillColor` / `strokeColor` per rect; panel color inputs; `updateMaskRectById` (and canvas) wired from `OcrFlowView`
  - preview/export color sync: shared `paintMaskRectsOnBitmap` (`src/core/export/maskCanvas.ts`) for `maskCanvas` preview and `buildMaskCanvas` in export
  - layout: `OcrFlowView` workbench + collapsible step panels; `OcrCanvasEditor` / `OcrPiiPanel` spacing and visual hierarchy aligned with app tokens
  - docs: `docs/INFO.md` / `docs/PROGRESS.md` updated to match this phase
  - automated validation: type-check, build, ESLint (no max-warnings), oxlint, Vitest — all green in CI-style runs

---

## In Progress

- None (open items are optional / future phases below).

---

## Not Started Yet

- Optional: brush masking or richer mask editing (see docs/INFO.md PII / canvas notes)
- Optional: automated E2E (e.g. Playwright) not in the project yet

---

## Key Decisions

### Workflow

Use a single pipeline:
upload → OCR → review/edit → optional PII → export

Do not split into separate OCR mode / PII mode.

### Architecture

Use layered structure:

- core
- composables
- components
- workers
- stores

### Canvas

Use 3-layer canvas:

- baseCanvas
- maskCanvas
- uiCanvas

### Development Order

1. OCR core
2. Export
3. PII masking
4. Canvas full workflow
5. UI + canvas polish (layout, languages, move/resize, per-mask colors, export parity)

---

## Notes

- claude.md should stay short
- docs/INFO.md is the architecture source of truth
- docs/PROGRESS.md is the status / decision log

---

## Next Suggested Step

1. Optional: add Playwright (or similar) smoke E2E for upload → OCR → export path.
2. Optional: brush or advanced mask editing as a scoped phase if product needs it.
3. Keep `docs/INFO.md` in sync when export rules, mask model, or OCR contracts change.
