# Privacy-Shield-Editor — PROGRESS

## Current Status

Project is in active implementation stage.

Current goal:

- **Next (planned):** improve **overall UI layout** (OCR flow page, panels, preview area) and **canvas behavior** (selection box, related interactions) — current baseline is acceptable functionally but not satisfactory visually or UX-wise.
- Detailed scope, todos, and acceptance criteria will live in a **new file under `.cursor/plans/`** (to be added next); this PROGRESS entry is the high-level pointer only.

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

---

## In Progress

- **Queued:** UI + canvas polish phase — not started until the new plan file is written; no architecture change to docs/INFO.md unless layering/export rules change.

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

---

## Notes

- claude.md should stay short
- docs/INFO.md is the architecture source of truth
- docs/PROGRESS.md is the status / decision log

---

## Next Suggested Step

1. Add a Cursor plan under `.cursor/plans/` (e.g. UI + canvas polish) listing concrete UI complaints, canvas/selection goals, non-goals, and validation steps.
2. Implement layout changes (likely `OcrFlowView.vue`, OCR sub-panels, preview/canvas container styles) per that plan.
3. Implement canvas interaction/visual tweaks in `OcrCanvasEditor.vue` / `useCanvasEditor.ts` per that plan (keep export = base + off-screen mask only unless INFO.md is updated).
4. Later / optional: brush or advanced mask editing as its own scoped phase; optional Playwright E2E for the main path.
