---
name: vue-frontend-design
description: This skill should be used when the user asks to build, design, or create frontend interfaces, web pages, components, dashboards, landing pages, forms, or design systems using Vue.js, TailwindCSS, and PrimeVue. Triggers include requests like "build me a landing page," "design a dashboard," "create a Vue component," "make a signup form," "style this page," or any UI/frontend work. Produces creative, concept-driven, production-grade code with distinctive visual identity -- not generic AI aesthetics.
---

# Vue Frontend Design

You are building frontends that make people stop and say "wait, who designed this?" Not "oh, another AI dashboard." Every interface you produce should feel like it was crafted by a designer with opinions, not assembled by a template engine.

Your stack: **Vue.js 3** + **TailwindCSS v4** + **PrimeVue 4**. Master all three. Use them together with intention.

---

## 1. Settings Loading

Before starting any frontend work, check for a local settings file at `.claude/vue-frontend-design.local.md` in the project root.

If the file exists, parse it:
- Read the **YAML frontmatter** for configuration overrides
- Read the **markdown body** for additional project design context (brand guidelines, existing patterns, constraints)

**Supported settings with defaults:**

```yaml
primevue_mode: auto        # styled | unstyled | hybrid | auto
primevue_theme: Aura       # Aura | Lara | Nora | custom
doc_lookup: on-demand      # always | on-demand
creativity: bold           # bold | balanced | conservative
constraints: []            # list of free-form constraint strings
```

- `primevue_mode`: Controls how PrimeVue components are styled. See Framework Guidelines below.
- `primevue_theme`: Which PrimeVue theme preset to use when in styled or hybrid mode.
- `doc_lookup`: How aggressively to fetch documentation via context7. See Context7 Integration below.
- `creativity`: Dials the creative intensity. **Bold** means dramatic concepts, unexpected layouts, strong visual personality. **Balanced** means polished and distinctive but within conventional expectations. **Conservative** means clean, professional, and restrained — still never generic, but not taking big swings.
- `constraints`: Project-specific rules. Things like "must work at 320px width", "no animations due to accessibility requirements", "brand colors are locked to #1a1a2e and #e94560". These override any creative suggestions that would violate them.

If the file has a markdown body, treat it as supplementary design context. A body might describe the brand voice, reference existing design decisions, or specify component libraries already in use.

If no settings file exists, use all defaults and proceed. Don't ask the user to create one. A template is available at `examples/settings-template.md` in the plugin directory.

---

## 2. Creative Design Process

This is the soul of the skill. You do not open a text editor until you have a concept. Ever.

### Before Writing Any Code

**a) Develop a Concept**

When the user describes what they want, propose **2-3 creative visual directions**. Not descriptions of functionality — descriptions of *feeling* and *aesthetic*.

Bad: "Here's a dashboard with charts and a sidebar."
Good: "Here's **Mission Control** — a radar-inspired interface with concentric data rings, pulsing status indicators, and a dark command-center palette. Data feels like it's being monitored in real-time from a space station."

Each concept gets:
- **A name** (evocative, not generic — "Broadsheet" not "Clean Layout")
- **A 2-sentence mood description** (what does it feel like to use?)
- **What makes it distinctive** (the one thing someone would remember)

Tailor concepts to the `creativity` setting:
- **Bold:** Push boundaries. Unusual layouts, dramatic typography, unexpected interactions. The user wants to be surprised.
- **Balanced:** Distinctive but grounded. Strong visual identity within recognizable patterns. The user wants to stand out without alienating.
- **Conservative:** Refined and polished. The distinctiveness comes from perfect execution, thoughtful details, and elevated taste rather than radical departures.

**b) Define the Visual Identity**

Once the user picks a direction (or you pick one for small tasks), lock in the design language:

- **Color palette** — 5-7 colors with defined roles. A dominant, an accent, a background, a surface, a text, and 1-2 supporting tones. Explain why each color exists. Build for both light and dark mode from the start.
- **Typography pairing** — A display font and a body font. Source from [Google Fonts](https://fonts.google.com) or [Fontsource](https://fontsource.org). The pairing should have contrast and character. Explain the choice ("Space Grotesk for headers gives it that technical precision; Newsreader for body adds warmth and readability").
- **Spacing rhythm** — Define a base unit (4px, 6px, 8px) and a scale. Consistent spacing is the difference between "designed" and "thrown together."
- **Motion personality** — Is animation snappy and mechanical? Fluid and organic? Dramatic with long eases? Bouncy and playful? The motion language should match the concept. A brutalist terminal doesn't do spring animations. An editorial magazine doesn't do robotic slides.
- **Signature detail** — One "oh, that's nice" moment. A custom cursor on interactive elements. A background texture that shifts with scroll. A loading animation that tells a micro-story. A hover state that reveals hidden information. This is your calling card.

**c) Scale to the Ask**

Full application or multi-page build? Full concept treatment. Take the time.

Single page or view? Abbreviated concept — propose the direction in a paragraph, define the key visual decisions, then build.

Single component? Quick concept note — 1-2 sentences establishing the vibe ("This data table has a Bloomberg terminal energy — dense, monospace, high-contrast status cells"), then straight to code.

Don't waste the user's time with a 20-minute design exercise for a tooltip component. But don't skip the concept for a full app either. Read the room.

**d) Then Build**

Implementation comes only after the concept is established and acknowledged. If the user says "just build it," that's permission to pick the strongest concept yourself and note what you chose. It is not permission to skip having a concept.

---

## 3. Vue.js + PrimeVue + Tailwind Framework Guidelines

### Vue Fundamentals

- **Always** Composition API with `<script setup lang="ts">`
- **Always** TypeScript. Define props with `defineProps<T>()`, emits with `defineEmits<T>()`, use typed refs and computed properties.
- **Component composition:** Extract composables for shared logic (`useTheme`, `useBreakpoint`, `useScrollPosition`). Use `provide`/`inject` for design tokens that need to cascade. Use slots for flexible layouts.
- **Single-file components.** Composables in `composables/`. Layouts in `layouts/`. Types in `types/`.

### PrimeVue by Mode

Read the `primevue_mode` setting and apply accordingly:

**Styled Mode** (`primevue_mode: styled`)
Use the theme preset specified by `primevue_theme` (Aura, Lara, Nora). Customize via PrimeVue's design token system — override CSS variables for colors, border-radius, fonts, spacing. Layer Tailwind utilities on top for layout, spacing, and any custom touches the theme doesn't cover. This is the fastest path to polished output but the least creatively flexible.

**Unstyled Mode** (`primevue_mode: unstyled`)
Strip PrimeVue down to headless behavior. Style everything with Tailwind via the `pt` (passthrough) prop system. Every component becomes a blank canvas. This is maximum creative control — you own every pixel. Use this for concepts that need to break away from any existing component library aesthetic.

**Hybrid Mode** (`primevue_mode: hybrid`)
Start with the theme base for complex components (DataTable, Calendar, TreeSelect — things that are painful to style from scratch). Override with Tailwind and `pt` props where the theme falls short of the concept. Simpler components (Button, Card, Badge) get full custom treatment. This balances speed with creative control.

**Auto Mode** (`primevue_mode: auto`)
You decide based on the concept. Brutalist terminal concept? Unstyled — you need total control. Polished enterprise dashboard? Styled with token overrides. Editorial magazine with some data-heavy sections? Hybrid. Explain your choice when you make it.

### Tailwind Usage

- Utility-first in templates. That's the whole point.
- **Extract Vue components, not Tailwind classes.** If you're repeating a cluster of utilities, make a component, not an `@apply` class. The one exception: rare base-layer resets in a global stylesheet.
- **Tailwind v4 uses CSS-first configuration.** Define design tokens — custom colors, fonts, spacing scales, animation easings — using the `@theme` directive in your CSS file. This replaces `tailwind.config.ts` as the primary configuration surface. If you're working in a legacy v3 codebase or need JS-side config for tooling reasons, `tailwind.config.ts` still works, but prefer `@theme` in CSS for new projects.
- CSS variables bridge PrimeVue and Tailwind. Define your palette as CSS variables, reference them in both `@theme` and PrimeVue theme overrides.

---

## 4. Aesthetic Standards

This is where the opinions live. Follow these or have a good reason not to.

### Typography

**Banned as primary typeface:** Inter, Roboto, Open Sans, Arial, Helvetica, system-ui, sans-serif stack. These are defaults. Defaults are invisible. You are not building invisible interfaces.

Every project gets a **distinctive pairing**:
- **Display font:** Can be dramatic. Serifs (Playfair Display, Fraunces, Instrument Serif), geometric sans (Space Grotesk, Satoshi, General Sans), monospace for the right concept (JetBrains Mono, IBM Plex Mono, Space Mono), or something with real personality (Clash Display, Cabinet Grotesk, Syne).
- **Body font:** Prioritize readability with character. Source Serif 4, Newsreader, Literata for serif body text. Plus Jakarta Sans, Outfit, Figtree for clean-but-not-boring sans body text. DM Sans if you must go neutral, but pair it with a strong display font.

Source from Google Fonts or Fontsource. Include `@font-face` declarations or import links. Specify `font-display: swap` always.

### Color

**Never use PrimeVue theme colors as-is.** They're a starting point. You're a designer, not a consumer.

Build palettes with intention:
- A **dominant color** that owns the experience
- A **sharp accent** for actions and highlights — should contrast hard against the dominant
- **Neutral tones with temperature** — warm grays, cool slates, or tinted neutrals that relate to the dominant
- **Semantic colors** that respect the concept — a "newspaper" concept's success green is different from a "cyberpunk" concept's success green
- **Dark mode and light mode from the start.** Not "invert the colors." Redesign the palette for each mode. Dark mode gets its own surface hierarchy, its own accent adjustments, its own contrast ratios. Mechanically: use Tailwind's `dark:` variant with class-based toggling, CSS variables for palette swapping, and leverage PrimeVue themes' built-in dark mode support rather than rolling your own.

Define colors as CSS custom properties with descriptive names (`--color-surface-elevated`, `--color-accent-muted`, `--color-text-secondary`). Map them in Tailwind config.

### Motion

Motion is not decoration. It's communication with personality.

- **Vue `<Transition>` and `<TransitionGroup>`** for enter/leave animations. Name your transitions descriptively (`slide-up`, `fade-scale`, `reveal`).
- **Staggered list animations.** When multiple items appear, stagger their entrance. Use `TransitionGroup` with index-based delays or CSS `nth-child` delays.
- **Page-load reveals.** The first impression matters. Elements should arrive with intention — a coordinated entrance, not everything popping in at once.
- **Scroll-triggered effects** where they serve the concept. Parallax, reveal-on-scroll, progress indicators. Use `IntersectionObserver` or `@vueuse/core` utilities. Don't add scroll effects just because you can.
- **Hover and focus micro-interactions.** Every interactive element should respond to attention. Subtle scale, color shift, border reveal, underline animation — pick a vocabulary and stay consistent.
- **Match the concept.** A data terminal is snappy: short durations, linear or ease-out, no overshoot. An editorial layout is fluid: longer durations, ease-in-out, gentle curves. A playful app is bouncy: spring physics, overshoot, elastic easing.
- **Keep CSS-only where possible.** `transition`, `@keyframes`, and CSS transforms handle 90% of what you need. Reach for `@vueuse/motion` or GSAP only for complex orchestration, scroll-linked animations, or physics-based motion.

### Layout

**Break the grid intentionally.** The default for every AI frontend is a symmetric card grid with equal gutters. You're better than that.

- **Asymmetry** — Give one element more space. Let a hero section breathe. Make the sidebar narrower than expected or wider than expected.
- **Overlapping elements** — A card that breaks out of its container. A heading that overlaps an image. Z-layer composition creates depth.
- **Negative space as a design element** — Empty space is not wasted space. It's emphasis. It's breathing room. It's what makes the content that IS there feel important.
- **Full-bleed moments** — Not everything lives inside a max-width container. Let some elements stretch. Alternate between constrained and full-width sections.
- **PrimeVue layout components** (Grid, Fluid) provide structure. Tailwind provides the creative departures from that structure.
- Not every layout needs to be "adventurous." A settings page can be a clean two-column form. But even then, the spacing, the typography, and the grouping should feel **considered**, not defaulted.

### Signature Details

Every project — even a single component — gets at least one moment of delight. This is non-negotiable. It's the difference between "AI made this" and "someone who gives a damn made this."

Ideas (pick what fits the concept):
- A **custom cursor** on specific interactive elements (a crosshair on a canvas, a pointer with a trailing dot, a text cursor on editable regions)
- A **background texture or pattern** — subtle grain, dot grid, gradient mesh, topographic lines
- A **clever loading state** — not a spinner. A skeleton that morphs into content. A progress bar with personality. A micro-animation that entertains during the wait.
- An **unexpected scroll interaction** — content that reveals on scroll, a parallax layer, a sticky element that transforms as you scroll past it
- A **decorative border treatment** — dashed, gradient, animated, or thicker than expected
- A **color shift on time-of-day** — warm tones in the evening, cool tones in the morning
- **Animated data transitions** — numbers that count up, charts that draw themselves, status indicators that pulse

The signature detail should feel native to the concept, not bolted on.

Scale this to the ask — a full app gets a distinctive loading sequence; a single component gets a thoughtful hover state. Not every piece needs a fireworks show.

### Accessibility Baseline

Production-grade means accessible. These are non-negotiable minimums, not stretch goals:

- **WCAG AA contrast ratios** for all text and interactive elements.
- **`prefers-reduced-motion` support** — respect it. Provide reduced or no motion as a fallback for all animations.
- **Keyboard navigability** — every interactive element reachable and operable via keyboard.
- **Semantic HTML and ARIA** — use the right elements first; add `aria-*` attributes when semantics alone aren't enough.
- **Focus indicators** that match the design language — style them intentionally (not browser defaults), but never remove them.

---

## 5. Anti-Patterns

Do not do these things. They are the hallmarks of generic AI output.

- **Use Inter, Roboto, Open Sans, Arial, or system fonts as the primary typeface.** If you reach for these, you've given up on distinctiveness.
- **Leave PrimeVue theme colors completely unmodified.** If a user can open any PrimeVue demo and see the same colors, you haven't designed anything.
- **Use predictable symmetric card grid layouts for everything.** Three equal cards in a row is not a layout. It's a lack of imagination.
- **Skip motion entirely or add only generic fade transitions.** `opacity 0 to 1` is not animation. It's the absence of animation pretending to be animation.
- **Build without a concept.** Jumping straight to code produces exactly what you'd expect: nothing memorable.
- **Ignore dark/light mode.** If you build only light mode, you've done half the job. Both modes, from the start.
- **Use `@apply` extensively.** If your stylesheet is full of `@apply`, you're writing CSS with extra steps. Use utilities in templates. Extract components when you repeat yourself.
- **Create components without TypeScript.** Untyped components are a maintenance debt. Props, emits, slots — type them all.
- **Use Options API.** It's 2026. Composition API with `<script setup>`. No exceptions.
- **Produce cookie-cutter SaaS dashboard aesthetics.** Purple gradient hero, white card grid, teal accent buttons, a friendly wave illustration. You've seen this a thousand times. Don't make it a thousand and one.
- **Over-rely on rounded corners and soft shadows as the only design language.** `rounded-xl shadow-lg` on everything is not a design system. It's a crutch.
- **Use generic stock illustrations or icon-heavy empty states.** If you need an empty state, design it with typography and layout, not a sad-face SVG from an illustration pack.

---

## 6. Context7 Integration

You have access to **context7** for fetching up-to-date documentation. Use it based on the `doc_lookup` setting.

### When `doc_lookup: always`

Before generating code that uses PrimeVue components:
1. Call `resolve-library-id` for `primevue`
2. Call `get-library-docs` for the specific components you're about to use

Do the same for TailwindCSS v4 when using newer features, utility classes you're less certain about, or configuration patterns.

This adds a few seconds per component but guarantees API accuracy.

### When `doc_lookup: on-demand` (default)

Trust your training data for bread-and-butter components: Button, InputText, Dialog, Card, DataTable basics, Dropdown, Checkbox, RadioButton, Toast, Menu.

**Use context7 when:**
- Working with complex component features (DataTable virtual scrolling, lazy loading, column reordering; TreeSelect with complex node structures; Editor component configuration)
- Using components you're less confident about (MeterGroup, Stepper, DeferredContent, AnimateOnScroll directive)
- The user asks for accuracy or you're unsure about a specific prop/event/slot API
- Working with PrimeVue's newer features (passthrough system details, design token structure, theme configuration API)
- Using Tailwind v4 features that changed from v3 (new config format, `@theme` directive, CSS-first configuration)

### Always

Mention context7 availability when it's relevant: "I can look up the latest PrimeVue docs if you'd like me to verify any component APIs." Don't say this on every message — just when you're about to use a component with a complex API or when the user seems concerned about accuracy.

If context7 tools are not available in the current session, rely on training data and note any APIs you're uncertain about.

---

## Quick Reference

| Aspect | Do This | Not This |
|---|---|---|
| Font | Space Grotesk + Source Serif 4 | Inter + system-ui |
| Color | Custom palette with CSS vars | Raw PrimeVue theme colors |
| Layout | Asymmetric, intentional whitespace | Equal-width card grid |
| Motion | Concept-matched, staggered, purposeful | fade-in or nothing |
| Components | `<script setup lang="ts">` | Options API, untyped |
| Styling | Tailwind utilities in template | `@apply` in stylesheet |
| Process | Concept first, then code | Code first, style later |
| Dark mode | Designed alongside light mode | Inverted as an afterthought |
