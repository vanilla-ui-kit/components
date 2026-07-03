# Vanilla UI Kit

Single-file, zero-dependency UI components for vanilla JavaScript. Each one is
a standalone file you can drop into any page — no build step, no framework, no
CSS imports — and they **converge** when used together: load the bundle (or the
optional core) and they share one theme engine, one positioning engine, and one
line of unified theming.

*Exactly what it says: a UI kit for vanilla JavaScript — the script tag, the
global, the single file, the way the web has always worked.*

Beautiful by default, automatic light/dark, fully keyboard-accessible — and
**headless when you want**: every component can run with zero injected CSS so
you bring your own design.

## Components

| Component | Global | File | Docs |
|---|---|---|---|
| Date picker (single, range, multi-pane, presets) | `DatePicker` | [`datepicker/datepicker.js`](./datepicker/datepicker.js) | [README](./datepicker/README.md) |
| Toasts / notifications | `Toast` | [`toast/toast.js`](./toast/toast.js) | [README](./toast/README.md) |
| Convergence core (optional) | `VanillaUI` (alias `VC`) | [`core/core.js`](./core/core.js) | below |

Roadmap: select/combobox, modal, tooltip/popover — same contract, same DNA.

## Get it any way you like

**CDN, the whole family (one file):**

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/dist/vanilla-ui-kit.js"></script>
<script>
  new DatePicker('#date')
  Toast.success('Saved')
</script>
```

**CDN or local copy, one component** — every component is self-contained, so
this is still just one file with zero dependencies:

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/toast/toast.js"></script>
```

**npm:**

```js
// npm i vanilla-ui-kit  (or: npm i github:vanilla-ui-kit/components)
const { DatePicker, Toast, VC } = require('vanilla-ui-kit')  // bundle
const DatePicker = require('vanilla-ui-kit/datepicker')      // one atom
const Toast = require('vanilla-ui-kit/toast')
```

All files are UMD (browser global, CommonJS, AMD) and SSR-safe — importing in
Node is a no-op until used in a browser.

## Convergence: what the core gives you

Components never *require* the core — but when it is on the page (via
`core/core.js` or the bundle, as global `VanillaUI` with `VC` as the short
alias used below), they register with it and share its services:

```js
VC.components            // { datepicker: DatePicker, toast: Toast }
VC.DatePicker, VC.Toast  // the same constructors, namespaced

// One call to theme the whole family:
VC.config({
  theme: 'dark',         // pin light/dark for every component ('auto' to undo)
  accent: '#b45309',     // mapped onto --vdp-accent, --vt-accent, …
  radius: '10px',
  font: 'Inter, sans-serif'
})

VC.theme.resolve()       // 'light' | 'dark' — shared detection:
                         // <html data-theme|data-bs-theme> → .dark class → OS
VC.theme.watch(fn)       // one matchMedia + one MutationObserver for the page
VC.theme.set('dark')     // stamps <html data-theme> (all components follow)

VC.position(panel, anchor, {prefer: 'auto', gap: 6})
                         // shared popup placement: flip, clamp, <dialog> top layer

VC.autoInit(root)        // run every component's data-attribute init on new DOM
VC.injectStyles(id, css) // deduped, inserted before page CSS so your CSS wins
```

Load order never matters: components that load after core self-register;
core adopts family globals that loaded before it.

## Headless: bring your own design

Styling is a separable layer on every component. Three ways to use it:

**1. Batteries included (default)** — CSS is embedded and injected once on
first use. Zero configuration.

**2. Fully headless** — no stylesheet is ever injected; you get semantic
markup with stable class hooks (`.vdp-*`, `.vt-*`), state classes
(`is-selected`, `is-disabled`, `in-range`, `vt-in`, …) and all
behavior/ARIA/keyboard handling, and you style it from scratch:

```js
new DatePicker('#date', { styles: false })
Toast.defaults.styles = false
```

```html
<input data-datepicker data-styles="false">
```

**3. Own the stylesheet** — start from ours and edit. The CSS ships as real
files in `dist/`, and every component exposes its stylesheet string:

```html
<link rel="stylesheet" href=".../dist/datepicker.css">  <!-- your edited copy -->
<script>new DatePicker('#date', { styles: false })</script>
```

```js
DatePicker.css   // the raw stylesheet string
Toast.css        // e.g. feed into your build pipeline
```

Note: style injection is deduped globally — one styled instance injects for
the whole page, so headless pages should pass `styles: false` everywhere
(or set it once via `DatePicker.defaults` / `Toast.defaults`).

## CSS isolation: the salt namespace

Host pages are hostile territory: design systems ship global `button {}`
resets and generic state classes (`.is-selected`, `.is-disabled`, `.is-active`)
that would otherwise bleed into the widgets. Every component therefore renders
under a **salt namespace** — an extra class on its root (`vc1` by default)
that is baked into every *structural* selector at inject time:

```css
/* what actually ships */
.vdp.vc1 .vdp-day.is-selected { … }   /* not .vdp-day.is-selected */
.vt-stack.vc1 .vt { … }               /* not .vt */
```

That extra specificity means a page rule like `body .is-disabled { display:
none }` or `button { background: red }` can't touch the components, while the
components' own selectors (all `.vdp-*` / `.vt-*` prefixed, now salted) can't
leak out. **CSS variable definitions stay unsalted on purpose** — vars are
already namespaced by name (`--vdp-*`, `--vt-*`), and they're the intended
override surface, so `.vdp { --vdp-accent: … }` from your CSS keeps working
exactly as documented.

The default salt is deterministic (`vc1`) so the extracted `dist/*.css` files
always match the DOM. Configure it **before the first render** (styles inject
once):

```js
DatePicker.salt = 'acme'        // per component…
VC.config({ salt: 'acme' })     // …or once for the whole family
DatePicker.salt = false         // opt out: plain unsalted selectors
```

If you set a custom salt and use the extracted CSS files, regenerate them
(`npm run build` reads the live `Ctor.css`, which always renders with the
current salt). Headless mode is unaffected — with `styles: false` nothing is
injected and you target the bare `.vdp-*`/`.vt-*` hooks yourself. Limits, for
honesty: `!important` page rules and inherited properties we don't set can
still reach in — full hard isolation would need Shadow DOM, which is out of
scope by design.

## Theming (styled mode)

Every color/metric is a CSS custom property (`--vdp-*` for the datepicker,
`--vt-*` for toasts), so you can restyle without going headless:

```css
.vdp, .vt { --vdp-accent: #0f766e; --vt-accent: #0f766e; }
```

or with the core loaded, once: `VC.config({ accent: '#0f766e' })`.

Auto light/dark resolves from `<html data-theme>` / `data-bs-theme`
(Bootstrap) / `.dark` class (Tailwind-style) → `prefers-color-scheme`, and
re-resolves live when any of those change.

## Building the bundle

```
npm run build   # node tools/build.js — regenerates dist/ (no dependencies)
```

`dist/` is committed so the CDN paths work straight from the repo.

## For component authors: the convergence contract

A new atom joins the family by exposing four statics and self-registering —
no imports, no coupling (see [the spec](./docs/specs/2026-07-03-core-design.md)):

```js
MyThing.css       = CSS_STRING;                   // separable stylesheet (rendered with the current salt)
MyThing.salt      = 'vc1';                        // salt namespace token (false to disable)
MyThing.rootClass = 'vx';                         // its CSS scope class
MyThing.themeVars = { accent: '--vx-accent' };    // shared keys → its vars
MyThing.varScopes = ['.vx', '.vx[data-theme=dark]']; // where vars are DEFINED (unsalted)
MyThing.autoInit  = function (root) { … };        // optional data-attr init

if (window.VC && typeof VC.register === 'function') VC.register('mything', MyThing);
```

Structural CSS should be authored against a `.SALT` placeholder on the root
class and rendered at inject time; var definitions stay unsalted (see the
datepicker/toast sources for the pattern).

## License

MIT
