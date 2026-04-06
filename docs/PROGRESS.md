# Privacy-Shield-Editor — PROGRESS

## Current Status

Project is in early planning / implementation stage.

Current goal:

- finalize architecture
- define document structure
- prepare Cursor-friendly project instructions

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

---

## In Progress

- defining project documentation structure
- preparing Cursor guidance files
- refining architecture and implementation order

---

## Not Started Yet

- actual project scaffold
- OCR worker implementation
- canvas rendering implementation
- OCR result editing UI
- export pipeline
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

1. scaffold Vite + Vue 3 + TypeScript project
2. integrate PrimeVue + Tailwind
3. create base folder structure
4. implement OCR worker skeleton
