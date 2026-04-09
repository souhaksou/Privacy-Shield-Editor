# Privacy-Shield-Editor — PROGRESS

## Current Status

Project is in active implementation stage.

Current goal:

- start Phase 3 PII core (regex detection + mask generation baseline)

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

---

## In Progress

- Phase 3 planning and implementation (PII detection + mask flow)

---

## Not Started Yet

- Phase 4: canvas rendering implementation (3-layer canvas full workflow)

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

1. implement regex-based PII detection baseline (email/phone/credit card/API key)
2. map PII matches back to OCR word-level bounding boxes
3. generate initial mask rectangles from detected matches
4. add minimal manual mask edit flow (add/remove)
