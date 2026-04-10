# Privacy-Shield-Editor — PROGRESS

## Current Status

Project is in active implementation stage.

Current goal:

- start Phase 4 canvas full workflow baseline (baseCanvas / maskCanvas / uiCanvas)

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

---

## In Progress

- Phase 4 planning and implementation (3-layer canvas full workflow)

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

1. add baseCanvas/maskCanvas/uiCanvas render skeleton with clear responsibility split
2. move current mask preview to maskCanvas rendering path (keep output identical)
3. ensure export still composes baseCanvas + maskCanvas only (exclude uiCanvas)
4. add minimal uiCanvas interaction layer baseline (selection/hover placeholder)
