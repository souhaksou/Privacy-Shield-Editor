# Cursor Rules — Privacy-Shield-Editor

These rules take precedence over general assistant behavior.

Always follow project context defined in:

- claude.md
- docs/INFO.md

---

## Scope Boundaries

### Allowed

- Bug fixes
- Small UI improvements
- Localized feature additions

### Not Allowed

- Do NOT change OCR pipeline flow
- Do NOT introduce backend services or APIs
- Do NOT replace core libraries
- Do NOT perform large-scale refactoring

---

## File Modification Rules

- Prefer editing existing files over creating new ones
- Do NOT create new files unless necessary
- Do NOT restructure folders
- Follow existing naming conventions

---

## Response Style

- Be concise
- Show only necessary code changes
- Avoid long explanations unless requested
- Do NOT over-engineer solutions

---

## Handling Uncertainty

- Ask questions if requirements are unclear
- Do NOT guess missing architecture or logic
- Do NOT assume unspecified behavior

---

## Anti-Patterns

- Do NOT rewrite entire components
- Do NOT introduce new frameworks
- Do NOT expand scope beyond the task
- Do NOT optimize prematurely

---

## Good vs Bad Examples

### ✅ Good

- Fix a specific OCR parsing issue in a single function
- Adjust a small part of UI rendering

### ❌ Bad

- Rewrite the entire OCR module
- Replace the existing architecture with a new design
