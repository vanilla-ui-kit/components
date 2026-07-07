# tools/

Zero-dependency Node scripts that build and grow the kit.

## build.js — `npm run build`

Regenerates `dist/` from the sources, driven by the `COMPONENTS` table
(one row per component: `[source file, browser global, dist stylesheet,
css banner name]`):

- `dist/vanilla-ui-kit.js` — core + every component in one CDN file. Each
  UMD source is embedded verbatim inside a scope that shadows
  `define`/`module`/`exports` (and pins `self`), forcing the browser
  branch; a footer re-exports the resulting globals for CJS.
- `dist/esm/vanilla-ui-kit.js` and `dist/esm/<name>.js` — the same code as
  native ES modules with the globals re-exported.
- `dist/<name>.css` and `dist/vanilla-ui-kit.css` — each component's
  embedded stylesheet, extracted via `require(source).css`.

Deterministic and offline. `npm run build:min` (tools/minify.js) then
produces the minified bundles and `dist/sri.json` (needs `npx terser`
once); `npm run size` (tools/size-check.js) gates on size budgets.

## new-component.js — the scaffolder

```
node tools/new-component.js <dir> <GlobalName> <rootClass> [registryName] [--wire]
node tools/new-component.js breadcrumb Breadcrumb vbc breadcrumb --wire
```

Stamps out `<dir>/<dir>.js` (a compilable, contract-complete ES5 skeleton
— implement the `TODO: component logic` regions), plus `README.md` and
`examples.html` skeletons in the family format. Validates that `<dir>`
doesn't exist yet, `<GlobalName>` is PascalCase and not already a bundle
global, and `<rootClass>` is short, lowercase, and unique across every
source in the repo. `registryName` defaults to `<dir>`.

With `--wire` it also inserts — idempotently, anchored on the current
last entry of each list, refusing before any write if an anchor is
missing — the component's row into `tools/build.js` `COMPONENTS`, its
`"./<dir>"` + `"./<dir>.css"` exports and `files` entry into
`package.json`, and its row into the `FAMILY` table in
`test/node.test.js`. Without `--wire` it prints the exact snippets to
paste. Afterwards: `npm run build`, `npm run build:min`, `npm test` — the
family-contract test loop picks the new component up automatically.

## The family contract

What every component must honour (mined from `toast/toast.js`, the
canonical example; enforced by the `family contract` test):

- **One file, zero dependencies, ES5 only.** No transpiler, no imports;
  the file is embedded verbatim in the bundle.
- **UMD wrapper** — AMD `define`, then CommonJS `module.exports`, then
  browser global `root.<GlobalName>`, with
  `typeof self !== 'undefined' ? self : this` as root.
- **SSR safety** — a single `HAS_DOM` flag guards every DOM touch.
  Loading in Node must work; constructors/statics return inert dummy
  handles (`el: null`, chainable no-op methods) instead of throwing;
  `autoInit()` returns `[]` without a DOM.
- **Embedded CSS as a separable layer** — the stylesheet lives in a `CSS`
  string using `--<rootClass>-*` custom properties, with the shared family
  palette (iris `#5b5bd6` accent, `#ffffff`/`#1b1d24` surfaces, etc.).
- **Salted structural rules** — structural selectors carry a `.SALT`
  placeholder, replaced at render time by the active salt class.
  `Ctor.salt` defaults to `DEFAULT_SALT = 'vc1'` (deterministic — matches
  the committed `dist/*.css`); a custom token is sanitised
  (`/[^\w-]/g` stripped); `salt = false` removes the class entirely.
  Custom-property *definitions* stay deliberately unsalted so page
  overrides like `.vt { --vt-accent: … }` keep working.
- **Live `css` getter** — `Object.defineProperty(Ctor, 'css', { get: … })`
  renders with the *current* salt (with a plain-string fallback if
  defineProperty throws). The build reads this to produce `dist/<dir>.css`.
- **Headless mode** — `defaults.styles = false` (or per-instance
  `styles: false`) means no CSS is ever injected; behaviour, ARIA and the
  markup contract survive.
- **Style injection converges on core** — use `VC.injectStyles(STYLE_ID,
  css)` when the core is present, else inject your own `<style
  id="vanilla-<dir>-styles">` *before* the page's first stylesheet, so
  page `--*` overrides win the cascade. `STYLE_ID` = `vanilla-<dir>-styles`.
- **Theme engine** — prefer `VC.theme` (resolve/watch) when core is
  loaded; otherwise a private watcher with the family resolution order:
  `data-theme`/`data-bs-theme` on `<html>` → `.dark`/`.light` class → OS
  `prefers-color-scheme`, re-resolved live via matchMedia listener +
  MutationObserver. `defaults.theme: 'auto' | 'light' | 'dark'` pins it.
- **Dark scoping via `[data-theme=dark]`** — the component stamps the
  resolved theme onto its own root element; dark palette overrides are
  scoped to `.<rootClass>[data-theme=dark]` (or the component's
  container equivalent), never to the page.
- **`defaults` object** — a single `Ctor.defaults` with `styles`, `theme`
  and a `labels` sub-object holding *every* user-facing string (i18n and
  ARIA names come from here, e.g. Toast's `labels.dismiss`).
- **Reduced motion** — a `@media (prefers-reduced-motion:reduce)` block
  kills all transitions/animations under the salted root.
- **Security posture** — user-supplied strings are TEXT (`textContent`);
  `innerHTML` only for component-owned trusted SVG or explicit
  `html: true` opt-ins.
- **Convergence statics** — `version` (must equal package.json's),
  `displayName` (matches the FAMILY table name), `rootClass` (short,
  unique, e.g. `vt`), `themeVars` mapping at least
  `accent`/`radius`/`font` to `--<rootClass>-*` names, and `varScopes`
  listing where those vars are *defined* (unsalted on purpose — light and
  dark scopes — so `VC.config()` bridge overrides land in both).
- **`VC.register(name, Ctor)`** at the end when `window.VC` exists, using
  the lowercase registry name.
- **Auto-init** — components with a declarative form expose
  `autoInit(root?)` scanning `[data-<rootClass>]`, run it on
  `DOMContentLoaded` (or immediately if the document is already parsed),
  and one bad container must not abort init for the rest of the page.
- **Comment style** — `/*!` license banner with quick-start, `/* ---- */`
  section dividers, and comments that explain *why*, not what.
- **Docs & wiring** — `<dir>/README.md` (CDN quick start pointing at
  `cdn.jsdelivr.net/gh/vanilla-ui-kit/components/...`, API, Theming,
  Headless sections) and `<dir>/examples.html` (light/dark toggle, live
  demo cards); rows in `tools/build.js` `COMPONENTS`, `package.json`
  `exports`/`files`, and the test `FAMILY` table.
