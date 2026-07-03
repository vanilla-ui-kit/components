# Vanilla UI Kit Core (`VC`) — Design Spec (2026-07-03)

## Goal
An umbrella library where the atomic components (datepicker, toast, and future
select/modal/tooltip) converge — without breaking the promise that made them
worth building: **each component remains a single, standalone, zero-dependency
file**. The core is optional glue, not a required runtime.

## Architecture: standalone atoms + optional core

```
core/core.js            → global `VanillaUI` / `VC` (the convergence layer)
datepicker/datepicker.js → global `DatePicker`  (works alone, converges if VC exists)
toast/toast.js           → global `Toast`       (works alone, converges if VC exists)
dist/vanilla-ui-kit.js → core + all components in one CDN file
```

Convergence is bidirectional and load-order independent:
- A component that loads **after** core self-registers:
  `if (window.VC && VC.register) VC.register('toast', Toast)`.
- Core, when it loads, **adopts** any known component globals already present.

Nothing imports anything. A page can load one atom, several atoms, atoms + core,
or the single bundle — all four work identically.

## What converges in core

| Facility | Purpose |
|---|---|
| `VC.register(name, ctor)` | Registry; exposes `VC.DatePicker`, `VC.Toast`, … |
| `VC.autoInit(root?)` | Runs every registered component's `autoInit` (data-attribute init) |
| `VC.theme` | Shared theme engine: `resolve()`, `watch(fn)`, `unwatch(fn)`, `set(t)` — one MutationObserver + one matchMedia for the whole page |
| `VC.position(panel, anchor, opts)` | Shared popup placement: below/above flip, viewport clamp, `<dialog>` top-layer detection (extracted from the datepicker) |
| `VC.injectStyles(id, css)` | Dedup'd style injection, before page CSS so page overrides win |
| `VC.config({accent, radius, font, theme})` | **Unified theming bridge** — one call restyles every registered component by mapping shared keys onto each component's own CSS variables |

## The convergence contract (for component authors)

A component participates by exposing three cheap statics — no code dependency:

```js
Toast.rootClass = 'vt';                       // its CSS scope class
Toast.themeVars = { accent: '--vt-accent',    // shared key → its own CSS var
                    radius: '--vt-radius',
                    font:   '--vt-font' };
Toast.autoInit  = function (root) { … };      // optional, data-attribute init
// and self-registration at the end of the file:
if (window.VC && typeof VC.register === 'function') VC.register('toast', Toast);
```

`VC.config({ accent: '#b45309' })` then injects one bridge stylesheet:
`.vdp{--vdp-accent:#b45309}.vt{--vt-accent:#b45309}` — appended to the end of
`<head>` so it wins over each component's own defaults, while per-instance
options (e.g. the datepicker's `accent`, which computes contrast-aware tints)
still win over the bridge via inline styles.

`VC.config({ theme: 'dark' })` stamps `data-theme` on `<html>` — which every
component already watches — so one call pins the whole family; `'auto'` removes
the attribute and returns everyone to OS/page detection.

## Toast (second atom, proves the contract)

Single file `toast/toast.js`, global `Toast`, `--vt-*` variables, same visual
family as the datepicker (same palette, radii, shadows, system font stacks).

```js
Toast.show('Saved', { type: 'success' })      // → handle {dismiss, update, el}
Toast.success / .error / .warning / .info / .loading
Toast.promise(fetch(…), { loading: 'Saving…', success: 'Saved', error: 'Failed' })
Toast.dismissAll()
Toast.defaults = { position: 'bottom-right', duration: 4000, … }
```

- Options: `type`, `title`, `duration` (0 = sticky), `position` (6 corners/
  centers), `action: {label, onClick}`, `dismissible`, `html` (opt-in; text by
  default — messages are rendered with `textContent`).
- Stacking per position, newest at the reading edge; max 5 visible, oldest
  auto-evicted; hovering a stack pauses every timer in it (resumes with the
  remaining time, not a fresh one).
- A11y: `role="status"`/`aria-live="polite"` for info/success, `role="alert"`/
  `assertive` for errors; dismiss buttons are real buttons; reduced motion
  respected.
- Theming: auto light/dark via the same resolution order as the datepicker
  (`data-theme`/`data-bs-theme`/`.dark` → `prefers-color-scheme`); uses
  `VC.theme.watch` when core is present, its own tiny watcher when standalone.
- SSR-safe: importable in Node, no-ops without a DOM.

## Bundle

`tools/build.js` (Node, zero dependencies) concatenates core + components into
`dist/vanilla-ui-kit.js` inside a wrapper that neutralizes each file's
AMD/CJS detection, so in a browser every part attaches its global, and in
Node the bundle exports `{ VanillaUI, VC, DatePicker, Toast }`. No minification — the
files are small and CDNs gzip; a `.min.js` can come later without changing
the architecture.

The bundle is committed so the CDN path works straight from the repo.

## Distribution — every way in, same files

| Channel | How |
|---|---|
| CDN, whole family | `<script src="…/dist/vanilla-ui-kit.js">` (one file: core + all atoms) |
| CDN, one atom | `<script src="…/datepicker/datepicker.js">` (unchanged single-file story) |
| npm | `npm i vanilla-ui-kit` → `require('vanilla-ui-kit')` for `{VC, DatePicker, Toast}`, or deep imports `vanilla-ui-kit/datepicker`, `vanilla-ui-kit/toast`, `vanilla-ui-kit/core` |
| Local file | copy any single component file into the project — no build step, no deps |

A root `package.json` maps the entry points (`main` → bundle, `exports` → per-
component deep imports and extracted CSS). Nothing about the files changes per
channel — the same UMD file serves script-tag, CJS, and AMD consumers.

## Headless — styling segregated from behavior

Every component's CSS is a **separable layer**, not a hard dependency:

1. **Batteries included (default)** — CSS is embedded in the JS and injected
   once on first use. Zero-config, styled, themed.
2. **Headless** — pass `styles: false` (or set `Toast.defaults.styles = false`)
   and no stylesheet is ever injected. The component still renders its full
   semantic markup: stable `.vdp-*` / `.vt-*` class hooks, state classes
   (`is-selected`, `is-disabled`, `in-range`, `vt-in`…), data attributes, and
   all ARIA/keyboard behavior. Users style it entirely from their own CSS.
3. **Own-the-stylesheet middle path** — the raw CSS is exposed as a static
   (`DatePicker.css`, `Toast.css`) and the build extracts real files
   (`dist/datepicker.css`, `dist/toast.css`, `dist/vanilla-ui-kit.css`),
   so users can `<link>` a copy, edit it, or run it through their pipeline
   while keeping `styles: false` in JS.

Because injection is deduped by style-element id, headless pages must keep
`styles: false` on every instance (any one styled instance injects for all —
documented).

## Salt namespace — isolation from host-page CSS

Threat model: host design systems ship global element resets (`button{}`) and
generic state classes (`.is-selected`, `.is-disabled`) that would override the
widgets; conversely our selectors must not leak out.

Mechanism: structural CSS is authored against a `.SALT` placeholder on the
component's root class and rendered at inject time —
`.vdp.SALT .vdp-day.is-selected` → `.vdp.vc1 .vdp-day.is-selected` — and the
salt class is stamped on the root element (`class="vdp vc1"`). The added
specificity (root class + salt class + hook class) outranks any realistic
generic page rule, and a nonstandard token makes accidental selector
collisions impossible.

Deliberately **unsalted**: custom-property *definitions* (`.vdp{--vdp-*}`,
dark-theme var rules). Var names are already namespaced, and these rules are
the documented override surface — salting them would break
`.vdp { --vdp-accent: … }` page theming.

Salt policy: deterministic default `vc1` (dist/*.css must match the DOM across
loads; snapshots stay stable), per-component override (`Ctor.salt = 'acme'`),
family-wide via `VC.config({salt})` (also applied to late-registering
components), `false` to disable. Must be set before first render — styles
inject once. `Ctor.css` is a live getter rendered with the current salt, so
builds pick up custom salts.

Contract addition: `Ctor.varScopes` lists the selectors where a component
*defines* its theme vars (light and dark scopes). The `VC.config()` bridge
writes to all of them, so e.g. a bridge accent also wins inside
`[data-theme=dark]` scopes instead of being shadowed by dark defaults.

Known limits (accepted): `!important` page rules and inherited properties we
never set can still reach in. True hard isolation is Shadow DOM territory —
out of scope; `styles:false` + own CSS remains the escape hatch.

## Out of scope
- A framework: no base classes, no lifecycle, no virtual DOM. Core is ~small
  utilities + a registry; components never *require* it.
- npm registry publishing itself (the package.json makes the repo installable
  from git/CDN today; publishing is a later, deliberate step).
