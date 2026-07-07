# Vanilla UI Kit Drawer

A single-file, zero-dependency drawer / side-sheet layer for vanilla
JavaScript — filters, carts, mobile nav. One `<script>` tag, one line of
JS. Follows your page's light/dark theme automatically, in the same
visual family as [Vanilla UI Kit Modal](../modal/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/drawer/drawer.js"></script>
<script>
  Drawer.open({ title: 'Filters', content: 'Anything here.' })
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/drawer`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
Drawer.open({
  side: 'right',           // 'right' | 'left' | 'top' | 'bottom'
  title: 'Your cart',
  content: 'Text',         // string | DOM element | markup with {html:true}
  size: '360px',           // width for left/right, height for top/bottom
  buttons: [               // optional footer, same shape as Modal's
    { label: 'Clear', onClick: (h) => {} },              // return false = stay open
    { label: 'Checkout', variant: 'primary', close: true }
  ],
  dismissible: true,       // Esc, backdrop click, and the ✕ button
  html: false,             // content is TEXT by default; opt in for markup
  onOpen: (h) => {},
  onClose: (result) => {}, // result = the `close` value of the button used
  styles: true             // false = headless (no CSS injected)
})
// → handle: { el, close(result), update(opts) }

Drawer.defaults.side = 'left'          // change any default once
```

A DOM element passed as `content` is **adopted** into the drawer and put
back where it came from (including `hidden`) when the drawer closes.

**Enhance existing markup** — keep your drawer's content in the page:

```js
var cart = new Drawer('#cart-panel', { side: 'right', title: 'Cart' })
cart.open()                 // .open({...extra}) merges per-call options
cart.close()                // cart.isOpen() → boolean
cart.destroy()              // restores the element, drops the instance
// also: Drawer.create(el, opts) → instance, Drawer.get(el) → instance | null
```

**Declarative** — no JS at all:

```html
<button data-vdr-open="#cart-panel">Cart</button>

<div id="cart-panel" hidden data-vdr-title="Your cart"
     data-vdr-side="right" data-vdr-size="380px">
  … <button data-vdr-close>Done</button>
</div>
```

`Drawer.autoInit(root?)` wires triggers added after load; anything with
`data-vdr-close` inside a drawer closes it.

## Behavior

- Uses the native `<dialog>` top layer when available, with an identical
  fallback overlay otherwise — both paths look and animate the same.
- Slides in from its edge (~0.2 s) over a fading backdrop; both honor
  `prefers-reduced-motion`.
- Focus moves into the drawer (`[autofocus]` → first field → primary
  button), Tab is trapped inside, and focus returns to the opener on
  close. Esc and backdrop-click dismiss unless `dismissible: false`.
- Body scroll is locked while any drawer is open, with scrollbar-width
  compensation so the page never shifts. Drawers stack — each new one
  opens above the last, and Esc closes only the top-most.
- `role="dialog"`, `aria-modal`, and `aria-labelledby`/`aria-label` are
  set for you.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin it with `Drawer.defaults.theme = 'dark'` (or per-call `theme`).

All colors are CSS custom properties:

```css
.vdr {
  --vdr-accent: #b45309;   /* primary button, focus rings */
  --vdr-danger: …;
  --vdr-bg: …; --vdr-text: …; --vdr-muted: …; --vdr-faint: …;
  --vdr-backdrop: rgba(20,21,26,.45);
  --vdr-radius: 14px; --vdr-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes drawers
and every other family component in one call.

**CSS isolation:** drawers render as `class="vdr vc1 vdr-right"` and all
structural rules ship salted (`.vdr.vc1 .vdr-panel { … }`), so host-page
design systems can't override them — while the `--vdr-*` variable
overrides above keep working (var definitions are deliberately unsalted).
Custom token: `Drawer.salt = 'acme'` before the first drawer; disable with
`Drawer.salt = false`.

## Headless

```js
Drawer.defaults.styles = false   // never inject CSS
```

You keep the full behavior (focus trap, scroll lock, stacking, ARIA) and
the markup contract below — style it entirely from your own CSS. Our
stylesheet is available as a starting point: `Drawer.css` (string) or
[`dist/drawer.css`](../dist/drawer.css) (file).

```
dialog.vdr.vdr-right.vdr-has-title.vdr-in[data-theme="dark"]   ← .vdr-out while leaving
  .vdr-panel                    ← slides; inline width/height from `size`
    .vdr-head
      .vdr-title                ← only when `title` given (else .vdr-head-spacer)
      .vdr-x                    ← only when dismissible
    .vdr-body
      .vdr-msg                  ← string content (adopted elements go here raw)
    .vdr-foot                   ← only when `buttons` given
      .vdr-btn.vdr-btn-primary
```

## License

MIT
