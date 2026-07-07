# Vanilla UI Kit Tabs

A single-file, zero-dependency tabs widget for vanilla JavaScript. Point it
at markup you already have — it wires up the full WAI-ARIA tabs pattern,
keyboard navigation, and an animated active-tab indicator. Follows your
page's light/dark theme automatically, in the same visual family as
[Vanilla UI Kit Toast](../toast/README.md) and
[DatePicker](../datepicker/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/tabs/tabs.js"></script>

<div class="my-tabs">
  <nav>
    <button>Tab A</button>
    <button>Tab B</button>
  </nav>
  <section>Panel A</section>
  <section>Panel B</section>
</div>

<script>new Tabs('.my-tabs')</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/tabs`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## Markup

**Canonical form** (shown above): the container's **first element child** is
the tab strip — its `<button>`s or `<a>`s become the tabs, in order — and
each **following sibling** is the panel for the tab at the same position.
The elements themselves don't matter (`<nav>`/`<div>`/`<ul>`,
`<section>`/`<div>`/`<article>` all work); panel content is left untouched.

When your structure doesn't fit that shape, pair explicitly:

```html
<div id="custom">
  <div class="my-strip">
    <button data-vtb-tab="overview">Overview</button>
    <button data-vtb-tab="pricing">Pricing</button>
  </div>
  <article data-vtb-panel="pricing">…</article>   <!-- any order -->
  <article data-vtb-panel="overview">…</article>
</div>
```

Tabs pair with the panel carrying the matching `data-vtb-panel` value
(valueless attributes pair by document order); the tablist becomes the
nearest ancestor containing all the tabs. Mark the initially active tab
with `data-vtb-active`, and disable one with the plain `disabled`
attribute — it is skipped by arrow-key navigation.

**Zero JS:** add `data-vtb` to the container and it initializes itself
(options via `data-active`, `data-vertical`, `data-activation`,
`data-theme`, `data-styles`).

## Builder mode

No markup at all — describe the tabs and Tabs renders everything:

```js
new Tabs('#host', {
  tabs: [
    { label: 'Overview', content: 'Plain text — always safe' },
    { label: 'Details',  content: someElement },              // moved in as-is
    { label: 'Report',   content: '<b>Trusted</b> markup', html: true },
    { label: 'Admin',    content: '…', disabled: true }
  ]
})
```

Labels and string content render with `textContent`; `innerHTML` is used
only behind the explicit `html: true` opt-in.

## API

```js
var tabs = new Tabs('.my-tabs', { active: 1, onChange: (i, t) => {} })

tabs.select(2)       // activate a tab (no-op for disabled/out-of-range)
tabs.active          // current index (also tabs.getActive())
tabs.destroy()       // unbind and restore every attribute it changed

Tabs.create(el, opts)  // = new Tabs(el, opts)
Tabs.get(el)           // instance for an element, or null
Tabs.autoInit(root?)   // init every [data-vtb] container (runs once on load)
```

A `tabs:change` CustomEvent (`detail: { index, tabs }`) also bubbles from
the container on every change.

## Options

| Option       | Default  | Description                                              |
| ------------ | -------- | -------------------------------------------------------- |
| `tabs`       | `null`   | `[{label, content, html?, disabled?, active?}]` — builder mode |
| `active`     | `0`      | initial tab index; a `data-vtb-active` tab wins over the default |
| `vertical`   | `false`  | vertical rail; arrows become ArrowUp/ArrowDown            |
| `activation` | `'auto'` | `'auto'` = focus selects; `'manual'` = Enter/Space selects |
| `theme`      | `'auto'` | `'auto'` \| `'light'` \| `'dark'`                         |
| `styles`     | `true`   | `false` = headless: no CSS injected (see below)           |
| `onChange`   | `null`   | `fn(index, tabs)` — after a tab is activated              |

Change a default once for the whole page: `Tabs.defaults.activation = 'manual'`.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin one instance with `{ theme: 'dark' }`.

All colors are CSS custom properties:

```css
.vtb {
  --vtb-accent: #b45309;   /* active tab + sliding indicator */
  --vtb-text: …; --vtb-muted: …; --vtb-faint: …;
  --vtb-radius: 8px; --vtb-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes tabs and
every other family component in one call.

**CSS isolation:** containers render as `class="vtb vc1"` and all structural
rules ship salted (`.vtb.vc1 .vtb-tab { … }`), so host-page design systems
can't override the widget — while the `--vtb-*` variable overrides above
keep working (var definitions are deliberately unsalted). Custom token:
`Tabs.salt = 'acme'` before the first instance; disable with
`Tabs.salt = false`.

## Headless

```js
Tabs.defaults.styles = false   // never inject CSS
```

You keep the full behavior (ARIA wiring, roving tabindex, keyboard
navigation, hidden panels) and the markup contract below — style it
entirely from your own CSS. Our stylesheet is available as a starting
point: `Tabs.css` (string) or [`dist/tabs.css`](../dist/tabs.css) (file).

```
.vtb.vtb-vertical[data-theme="dark"]     ← your container
  .vtb-list[role="tablist"]
    .vtb-tab[role="tab"][aria-selected]  ← your buttons/links
    .vtb-ink                             ← the sliding indicator (JS sets
                                            transform + width/height inline)
  .vtb-panel[role="tabpanel"][hidden]    ← your panels
```

## Keyboard & accessibility

Full [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/):
`role="tablist"` (plus `aria-orientation` when vertical), `role="tab"` with
`aria-selected`/`aria-controls`, `role="tabpanel"` with `aria-labelledby`
and `tabindex="0"` so panel content is reachable.

- **Tab** — into the strip (only the active tab is tabbable), then onward
  into the active panel.
- **ArrowRight / ArrowLeft** (**ArrowDown / ArrowUp** when vertical) — move
  through tabs, wrapping, skipping disabled ones. With `activation: 'auto'`
  focus also selects; with `'manual'` it only moves focus.
- **Enter / Space** — select the focused tab (`'manual'` mode).
- **Home / End** — first / last enabled tab.

Focus rings use `:focus-visible`; the indicator animation is disabled under
`prefers-reduced-motion: reduce`.

## License

MIT
