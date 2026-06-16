# Senses Studio — Design System

> Elegant, warm, and earthy brand system for **Senses Studio**, a Yoga + Pilates studio.
> Cream-anchored, script-led, unhurried.

---

## 1 · Overview

**Senses Studio** is a boutique **Yoga + Pilates** studio. The brand is built around calm,
sensory wellness — slow movement, breath, and restoration. The visual identity is
**feminine, editorial, and quiet**: a flowing signature script paired with a high-contrast
Didone-style serif, set on a warm cream ground with earthy browns and soft blush accents.

The brand promise reads as **"a space to move slowly and breathe deeply."** Everything in
the system favours air, restraint, and warmth over density or noise.

### Sources provided
This system was derived **entirely from the brand/logo package** the client supplied — there is
no product codebase or Figma file. Sources:

- `uploads/Senses Studio Final Files_V2-01…05.png` — logo suite in **black ink** on cream (#f5efea)
- `uploads/Senses Studio Final Files-09…12.png` — same suite in **warm brown** (#66554b) on ivory (#f6f4f0)
- `uploads/Eyesome Script.otf`, `Eyesome Regular.otf`, `Eyesome Italic.otf` — brand display fonts

> ⚠️ Because no product UI existed, the **UI kits in this system are an _application_ of the
> brand** to the surfaces a yoga studio needs (marketing website + booking app). They are
> faithful to the brand's type, colour, and tone — but they are new compositions, not
> recreations of an existing product.

---

## 2 · Brand assets

All logos live in `assets/`. The originals (with baked cream backgrounds) are kept; the files
without a colour suffix below are **cropped + alpha-keyed transparent PNGs in pure ink colour**,
so they drop cleanly onto any background.

| File | What it is |
|---|---|
| `logo-full-black.png` | Primary lockup — "Senses STUDIO" + "YOGA + PILATES" tagline |
| `logo-combo-black.png` | Combination mark — "Senses" (script) + "STUDIO" (serif) |
| `logo-script-black.png` | Horizontal script "Senses Studio" |
| `logo-stacked-black.png` | Stacked script (two lines) |
| `submark-black-trim.png` | "S" flourish submark |
| `*-brown.png` / `*-brown-trim.png` | Warm-brown (#66554b) versions of the above |

To place the mark on dark grounds, use the black transparent PNG with
`filter: brightness(0) invert(1)` (renders it ivory), as shown in the *Submark on Color* card.

**Logo selection** — Use the full lockup when there's room and the tagline adds value (footers,
hero, signage). Use the combination mark as the default header logo. Use the submark for
avatars, favicons, app icons, and tight spaces. Never re-typeset the wordmark; always use the
supplied art.

---

## 3 · Content fundamentals

The voice is **warm, calm, and quietly confident** — a knowledgeable friend, never a
drill-sergeant or a hype machine.

- **Person.** Speak to the reader as **"you"**; refer to the studio as **"we" / "our studio."**
- **Tone.** Soft, sensory, grounding. Invitational rather than instructional.
  *"Find your way back to yourself."* not *"Sign up to maximise your results!"*
- **Casing.** Sentence case for sentences and headings. **UPPERCASE with wide tracking**
  (`.18–.42em`) reserved for eyebrows, nav, buttons, and the tagline (`YOGA + PILATES`).
- **Length.** Short. A heading is a few words; a paragraph is two or three calm sentences.
  Lots of white space around copy.
- **Vocabulary.** breathe · flow · restore · ground · soften · move · gather · slow ·
  ritual · stillness · mat · breath.
- **Emoji.** None. The brand never uses emoji.
- **Punctuation.** Minimal. Occasional em-dash for a soft pause. Avoid exclamation marks.
- **Numbers/specs.** Stated plainly and gently — *"60 min · all levels · Studio A."*

**Examples**
- Hero: *"Senses Studio — a space to move slowly and breathe deeply."*
- Class blurb: *"A grounding morning flow to wake the body and steady the mind."*
- CTA: *"Book a class"* · *"View the schedule"* · *"Begin your trial"*
- Membership: *"Unlimited mat time, your way."*

---

## 4 · Visual foundations

**Colour.** A warm cream (**#f5efea**) is the key colour and default background almost
everywhere. Surfaces step up through ivory → sand → linen. Earth browns (**taupe #66554b**,
espresso, ink) carry text and primary actions. Soft **blush (#e7cfc6)**, **dusty rose (#c79b8e)**,
and **almond beige (#e0d2bf)** add feminine warmth; **terracotta** and **sage** appear only as
sparing accents. The palette is entirely warm — there are no cool greys, and no blues/purples.

**Type.** Three voices: **Eyesome Script** (signature accent, used for the word "Senses" and the
occasional flourish word), **Eyesome Serif** (Didone-like display for headings — high contrast,
elegant; italic available), and **Montserrat** (light, letter-spaced geometric sans for eyebrows,
nav, buttons, and body). **Cormorant Garamond** is an optional elegant serif for long body copy
and pull quotes. Headings are large and airy; body is light-weight with generous line-height (1.7).

**Backgrounds.** Predominantly flat warm cream — no busy patterns or noise. Imagery, when used,
is **warm-toned, soft-focus, natural-light photography** (studio interiors, bodies mid-movement,
plants, linen, stone) — never cold, never high-saturation. Large editorial photos sit in rounded
frames. Subtle tone-on-tone duotones (cream/taupe) are acceptable; avoid hard gradients. The only
gradients used are very soft tonal washes between two adjacent earth tones.

**Corner radii.** Soft and rounded throughout — pills (999px) for buttons and chips, large radii
(20–48px) for cards and image frames. Nothing sharp-cornered.

**Cards.** Ivory or cream fills, **large radius (20–24px)**, either a **soft diffuse shadow**
(`0 6px 24px rgba(58,50,44,.08)`) or a **1px linen border** — not both. No coloured left-border
accents. Imagery inside cards is rounded to match.

**Shadows / elevation.** Soft, warm, low-opacity, tinted with espresso (never pure black, never
cool). Three steps: sm (cards at rest), md (hover/raised), lg (modals/popovers). Elevation is
whisper-quiet; the brand prefers borders and spacing to heavy shadow.

**Borders.** 1px in **linen (#e3d6c6)** or a translucent taupe (`rgba(102,85,75,.16)`).
Hairline dividers separate sections.

**Spacing & layout.** 8pt base. Layouts are **airy** — section padding runs 96–128px; content
sits in comfortable measure with lots of breathing room. Generous, calm, never cramped.

**Motion.** Gentle and slow. Fades and soft rises (`translateY` 8–16px) on a `cubic-bezier(.22,.61,.36,1)`
ease-out over ~0.45s. No bounces, no spring, no fast snaps. Movement should feel like a breath.

**Hover states.** Subtle — a slight darkening of taupe, a soft shadow lift on cards, or an
underline growing on text links. **Press states.** A gentle scale-down (`scale(.98)`) and/or a
half-shade darker. Never harsh.

**Transparency & blur.** Used sparingly — a translucent cream/linen scrim over photography for
legibility; occasional soft backdrop-blur on a sticky header once scrolled. Not a defining motif.

**Imagery colour vibe.** Warm, sun-washed, natural light. Low contrast, gentle grain acceptable.
Skin tones natural. Think linen, clay, morning light — not clinical or neon.

---

## 5 · Iconography

The brand package contains **no icon set**. Senses Studio uses **no emoji** and **no unicode
symbol icons**. For interface needs we standardise on **[Lucide](https://lucide.dev)** — a thin,
rounded, open-source line set whose **light stroke and rounded caps** match the brand's elegant,
soft character. Load from CDN:

```html
<script src="https://unpkg.com/lucide@latest"></script>
<script>lucide.createIcons();</script>
```

Usage rules:
- **Stroke only**, never filled. Stroke width **1.5px**, colour **taupe (#66554b)** or **ink**.
- Keep icons small and secondary to type — they support, never dominate.
- Common icons: `calendar`, `clock`, `map-pin`, `user`, `menu`, `arrow-right`, `chevron-down`,
  `instagram`, `heart`, `play`.
- The **"S" submark** doubles as the brand's only proprietary glyph (favicon / app icon / avatar).

> If a closer-to-brand bespoke icon set is commissioned later, swap Lucide out here. Flagged as a
> **substitution** — Lucide is not part of the original brand package.

---

## 6 · Index — what's in this system

**Root**
- `README.md` — this file
- `colors_and_type.css` — all design tokens (colour, type, radius, spacing, shadow, motion) + font-face + helper classes
- `SKILL.md` — Agent Skill manifest

**`fonts/`** — `EyesomeScript.otf`, `EyesomeRegular.otf`, `EyesomeItalic.otf` (brand display family)

**`assets/`** — logo suite (originals + cropped transparent black & brown variants), submark

**`preview/`** — design-system cards shown in the Design System tab (colours, type, spacing, components, brand)

**`ui_kits/`**
- `website/` — marketing website UI kit (homepage, classes, schedule, pricing) — `index.html` + JSX components
- `app/` — member booking app UI kit (mobile) — `index.html` + JSX components

### Substitutions to confirm
- **Montserrat** (UI/labels/body) and **Cormorant Garamond** (serif body) are Google Fonts
  stand-ins — the brand package only included the Eyesome display family. Confirm or replace.
- **Lucide** icons are a substitution — no icon set was supplied.
