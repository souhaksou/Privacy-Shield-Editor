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
- export helpers
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
- mask rectangles
- export-related derived state

### editor store

UI state:

- current tool
- selection state
- loading state
- current step / panel state

---

## Canvas Design

Three-layer canvas architecture:

1. baseCanvas

- Draws original image only

2. maskCanvas

- Draws final masking result

3. uiCanvas

- Draws temporary interaction visuals
- selection box
- hover feedback
- brush preview

Rules:

- baseCanvas should not be modified by masking logic
- uiCanvas should not be included in final export
- export image should combine baseCanvas + maskCanvas only

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
- API keys

Default masking style:

- black rectangle

Manual editing should allow:

- add mask
- remove mask
- optional brush masking later

---

## Export Design

### Image Export

- combine baseCanvas + maskCanvas
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

Do not implement all phases at once.

---

## Constraints

- No backend
- No server upload
- No heavy libraries unless absolutely necessary
- Avoid over-engineering
- Prefer simple, localized changes
