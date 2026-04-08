# Privacy-Shield-Editor — PROGRESS

## Current Status

Project is in active implementation stage.

Current goal:

- complete Phase 2 export core (image + PDF baseline)

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

---

## In Progress

- Phase 2 export planning and implementation

---

## Not Started Yet

- canvas rendering implementation (3-layer canvas full workflow)
- export pipeline implementation
- PII detection pipeline

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

---

## Notes

- claude.md should stay short
- docs/INFO.md is the architecture source of truth
- docs/PROGRESS.md is the status / decision log

---

## Next Suggested Step

1. implement image export baseline (combine required layers)
2. implement PDF export baseline via pdf-lib (image-based first)
3. wire export actions into current OCR flow UI
4. run manual E2E: upload → OCR → edit → export image/PDF
