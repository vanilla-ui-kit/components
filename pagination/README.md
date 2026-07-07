# Vanilla UI Kit Pagination

A single-file, zero-dependency pagination control for vanilla JavaScript.
Point it at an empty element — it renders a full `<nav>` of real buttons
with boundaries, sibling windows, and ellipses, and calls you back when the
page changes. Follows your page's light/dark theme automatically, in the
same visual family as [Vanilla UI Kit Toast](../toast/README.md) and
[Tabs](../tabs/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/pagination/pagination.js"></script>

<div id="pager"></div>

<script>
  new Pagination('#pager', {
    total: 97,               // 97 items, 10 per page → 10 pages
    onChange: (page) => loadPage(page)
  })
</script>
```

Or zero-JS, with data attributes:

```html
<div data-vpn data-total="97" data-per-page="10" data-show-jump></div>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/pagination`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
const pager = new Pagination('#pager', {
  total: 97,                // item count (pairs with perPage) …
  perPage: 10,              // … items per page
  pages: null,              // OR pass the page count directly (takes precedence)
  page: 1,                  // initial page (clamped)
  siblings: 1,              // pages shown on each side of the current one
  boundaries: 1,            // pages pinned at each end
  compact: false,           // just  ← Prev  3 / 12  Next →
  showTotal: false,         // true = "1–10 of 97" | (total, [from, to]) => string
  showJump: false,          // "Go to" number input; Enter jumps, clamped
  onChange: (page, pager) => {},
  theme: 'auto',            // 'auto' | 'light' | 'dark'
  styles: true,             // false = headless (no CSS injected)
  labels: {                 // every string is replaceable (i18n)
    pagination: 'Pagination', prev: 'Prev', next: 'Next',
    prevAria: 'Previous page', nextAria: 'Next page',
    page: 'Page', jump: 'Go to'
  }
})

pager.getPage()                    // → current page (1-based)
pager.setPage(5)                   // clamped; fires onChange on a real move
pager.setPage(5, { silent: true }) // …or without firing
pager.update({ total: 41 })        // swap total/perPage/pages; page re-clamped
pager.destroy()                    // remove the nav, listeners, theme watcher

Pagination.create(el, opts)        // same as new Pagination(el, opts)
Pagination.get(el)                 // → instance previously bound to el (or null)
Pagination.autoInit(root?)         // init every [data-vpn] under root
```

A `pagination:change` CustomEvent (`detail: { page, pagination }`) also
bubbles from the target element on every page change.

## Behavior

- Renders inside `<nav aria-label="Pagination">`; every page is a real
  `<button>`, so keyboard access is native (Tab + Enter/Space).
- The current page carries `aria-current="page"` and ignores clicks;
  prev/next disable themselves at the ends; ellipses are inert,
  `aria-hidden` separators.
- The strip keeps a **constant item count** while paging — the sibling
  window shifts inward near the edges instead of shrinking, so nothing
  jumps around under the pointer. A gap that would hide only a single page
  becomes that page.
- `compact: true` swaps the strip for a live `3 / 12` readout between the
  prev/next buttons.
- `showJump` renders a labelled number input; Enter jumps to the clamped
  page and never submits a surrounding form. Reduced motion is respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin one instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vpn {
  --vpn-accent: #b45309;   /* current page, focus rings */
  --vpn-text: …; --vpn-muted: …; --vpn-faint: …; --vpn-bg: …;
  --vpn-on-accent: …;      /* text on the current-page button */
  --vpn-radius: 8px; --vpn-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes the pager
and every other family component in one call.

**CSS isolation:** the nav renders as `class="vpn vc1"` and all structural
rules ship salted (`.vpn.vc1 .vpn-btn { … }`), so host-page design systems
can't override it — while the `--vpn-*` variable overrides above keep
working (var definitions are deliberately unsalted). Custom token:
`Pagination.salt = 'acme'` before the first instance; disable with
`Pagination.salt = false`.

## Headless

```js
new Pagination('#pager', { total: 97, styles: false })
```

You keep the full behavior (windowing, clamping, ARIA, keyboard) and the
markup contract below — style it entirely from your own CSS. Our stylesheet
is available as a starting point: `Pagination.css` (string).

```
nav.vpn[aria-label="Pagination"][data-theme="dark"]
  .vpn-total                      ← only when showTotal (total mode)
  button.vpn-btn.vpn-prev         ← disabled on page 1
  .vpn-pages                      ← or .vpn-status[aria-live] when compact
    button.vpn-btn[data-page]     ← [aria-current="page"] on the current one
    .vpn-gap                      ← the … separators
  button.vpn-btn.vpn-next         ← disabled on the last page
  label.vpn-jump > input          ← only when showJump
```

## License

MIT
