# Vanilla UI Kit DatePicker — Design Spec (2026-07-03)

## Goal
A single-file, zero-dependency, CDN-ready date picker for vanilla JS. Dead simple to
use, beautiful by default, automatic light/dark theming with override, covering the
common use cases of a date picker (no time selection).

## Distribution
- One file: `datepicker/datepicker.js` (UMD: global `DatePicker`, CJS, AMD).
- CSS is embedded and injected once into `<head>` on first use. No external assets,
  no webfonts (system font stacks only) — safe under strict CSP style policies apart
  from inline-style injection, and weightless for CDN use.
- SSR-safe: importing in Node is a no-op until used in a browser.

## API
```js
const dp = new DatePicker('#date', { format: 'DD/MM/YYYY', min: 'today' });
// or zero-JS:
// <input data-datepicker data-format="DD/MM/YYYY" data-min="today">
```

### Options
| Option | Default | Notes |
|---|---|---|
| `value` | `null` | Initial date (`Date`, `'today'`, or string in `format`/ISO) |
| `format` | `'YYYY-MM-DD'` | Tokens: `YYYY YY MMMM MMM MM M DD D` |
| `min`, `max` | `null` | Same accepted types as `value` |
| `disabledDates` | `[]` | Array of dates/strings, or `fn(date) => bool` |
| `disabledDays` | `[]` | Weekday numbers, 0=Sun … 6=Sat |
| `range` | `false` | Range selection; input shows `start – end` |
| `rangeSeparator` | `' – '` | |
| `inline` | auto | `true`, or automatic when target isn't an input |
| `locale` | browser | BCP-47 tag; month/weekday names via `Intl` |
| `firstDay` | locale | 0–6; from `Intl.Locale.weekInfo` when available |
| `weekNumbers` | `false` | ISO-8601 week number column |
| `theme` | `'auto'` | `'auto' \| 'light' \| 'dark'` |
| `accent` | built-in iris | Any CSS color |
| `todayButton`, `clearButton` | `true` | Footer actions |
| `autoClose` | `true` | Close popup after selection |
| `position` | `'auto'` | Flips above when no space below |
| `onSelect(value, formatted, dp)` | | Also `onOpen, onClose, onMonthChange, onClear` |

### Methods
`open() close() toggle() getDate() setDate(d) clear() destroy() setOptions(o)`
Statics: `DatePicker.create`, `DatePicker.get(el)`, `DatePicker.formatDate`,
`DatePicker.parseDate`, `DatePicker.autoInit()`.

### Events
Native `change` plus `datepicker:select`, `datepicker:open`, `datepicker:close`
dispatched on the bound input.

## Behavior
- Views: day grid (fixed 6 weeks) → month grid → year grid; masthead cycles views.
- Popup appends to `<body>`, positions below/left of input, flips/clamps at viewport
  edges, repositions on scroll/resize; closes on outside pointerdown and Escape.
- Typing in the input parses on change/blur against `format` (fallback ISO); invalid
  text reverts to the last valid value.
- Range mode: first click sets start, second sets end (swapped if reversed); hover
  previews the band.
- Keyboard: arrows ±1/±7 days, PageUp/Down ±month, Shift+PageUp/Down ±year,
  Home/End week bounds, Enter/Space select, Escape closes and returns focus.
  Roving tabindex in the grid.
- A11y: `role="dialog"` popup, `role="grid"` calendar, `aria-selected`,
  `aria-disabled`, `aria-current="date"` on today, live announcement of month
  changes, visible focus rings, `prefers-reduced-motion` respected.
- Dates are date-only, handled in local time at midnight. No `toISOString` for
  formatting (UTC shift hazard).

## Theming
- Resolution order for `'auto'`: `<html data-theme>` / `data-bs-theme` / `.dark`
  class → `prefers-color-scheme`. Watched live via MutationObserver + matchMedia.
- Resolved theme is stamped as `data-theme` on the widget root; all colors are CSS
  custom properties (`--vdp-*`) overridable by page CSS or the `accent` option.

## Visual identity
- Signature: print-calendar masthead — month name in a system serif display stack
  (Iowan Old Style/Palatino/Georgia) over tabular-nums sans numerals.
- Selection: "date stamp" micro-animation (quick scale-settle), soft range band.
- Light: paper white / ink; Dark: deep slate (not pure black). Accent: iris
  `#5b5bd6` (light) / `#7b7bea` (dark), auto hover/soft tints via `color-mix`
  with static fallbacks.

## Addendum (same day)
- `panes: 1–3` — months side by side; outside-month days render as inert
  spacers so no date appears twice. Masthead shows the month span; month/year
  quick views and the Today button are disabled in multi-pane.
- `presets` — quick-select rail (surface-tinted sidebar with an eyebrow label).
  `true` = built-ins, `'last7,thisMonth'` = keyed subset, or custom
  `[{label, range|date|value}]` with functions resolved at click time. Active
  preset is highlighted (`aria-pressed`).
- Both exposed as `data-panes` / `data-presets` for zero-JS auto-init.
- Post-review hardening: focus retained through grid re-renders; popup closes
  on focus-out; Enter no longer submits forms; rollover ISO dates rejected;
  ISO weeks Thursday-anchored; range separator split un-trimmed at first
  occurrence with min/max validation on typed ranges; `setOptions` rebuilds
  panel chrome and migrates values across range-mode switches; custom accents
  derive readable on-accent + tints; styles inject before page CSS; panel
  joins native `<dialog>` top layer; invalid locales fall back gracefully.

## Out of scope
Time selection, linked two-input ranges (documented as a pattern using two
pickers + `onSelect`).
