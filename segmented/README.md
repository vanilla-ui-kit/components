# Vanilla UI Kit Segmented

A single-file, zero-dependency segmented control — the modern radio group
for view switchers and filter pills — for vanilla JavaScript. One `<script>`
tag, one line of JS. An animated thumb slides behind the active segment, and
it follows your page's light/dark theme automatically, in the same visual
family as [Vanilla UI Kit Tabs](../tabs/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/segmented/segmented.js"></script>

<div id="view"></div>
<script>
  new Segmented('#view', {
    options: ['List', 'Board', 'Calendar'],
    onChange: function (value) { console.log(value) }
  })
</script>
```

Or enhance buttons you already have (labels from text, values from
`data-value`, `disabled` respected) — with `data-vsg` it needs no JS at all:

```html
<div data-vsg data-name="view">
  <button data-value="list">List</button>
  <button data-value="board">Board</button>
  <button disabled>Timeline</button>
</div>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/segmented`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
var seg = new Segmented('#view', {
  options: [                    // or ['a', 'b'] shorthand (value = label)
    { value: 'list',  label: 'List' },
    { value: 'board', label: 'Board', icon: '<svg …>' },  // icon + label
    { value: 'map',   icon: '<svg …>', label: 'Map' ,
      iconOnly: true },         // icon-only; label becomes aria-label
    { value: 'x', label: 'Soon', disabled: true }
  ],
  value: 'board',               // initial; default = first enabled option
  name: 'view',                 // hidden <input> carries the value in forms
  size: 'md',                   // 'sm' | 'md'
  fullWidth: false,             // stretch segments evenly
  label: 'View',                // aria-label for the radiogroup
  onChange: function (value, seg) {},
  theme: 'auto',                // 'auto' | 'light' | 'dark'
  styles: true                  // false = headless (no CSS injected)
})

seg.getValue()                  // current value
seg.setValue('list')            // select (fires onChange)
seg.setValue('list', { silent: true })  // select without firing
seg.enable() / seg.disable()    // whole control (hidden input stops submitting)
seg.update(newOptions)          // replace options; selection kept when possible
seg.destroy()                   // unbind + restore the original children/attrs

Segmented.create(el, opts)      // same as new Segmented(...)
Segmented.get(el)               // instance for an element, or null
Segmented.autoInit(root?)       // init every [data-vsg] under root
```

A `segmented:change` CustomEvent (`detail: { value, segmented }`) also
bubbles from the container on every user change.

`icon` is a **trusted** SVG string (same trust model as Toast's built-in
icons) — never pass user-generated content. Labels are always rendered as
text. An option with an `icon` and no `label` (or `iconOnly: true`) renders
icon-only, with `aria-label` taken from its label/value.

`data-vsg` attributes: `data-value`, `data-name`, `data-size`,
`data-full-width`, `data-label`, `data-theme`, `data-styles`.

## Behavior & accessibility

- `role="radiogroup"` with `role="radio"` segments (`aria-checked`) and a
  roving tabindex — the whole control is one Tab stop.
- Radio semantics: **←/→** (and ↑/↓) move focus **and** select;
  **Home/End** jump to the first/last segment; disabled segments are
  skipped; **Space/Enter** also select the focused segment.
- The thumb re-measures on window resize and respects
  `prefers-reduced-motion` (no animation).
- In a `<form>`, `name` renders a hidden input that always carries the
  current value; `disable()` also disables it so it stops submitting.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vsg {
  --vsg-accent: #b45309;   /* checked label, focus ring */
  --vsg-bg: …;             /* thumb */
  --vsg-faint: …;          /* track */
  --vsg-text: …; --vsg-muted: …; --vsg-shadow: …;
  --vsg-radius: 10px; --vsg-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes the
segmented control and every other family component in one call.

**CSS isolation:** the control renders as `class="vsg vc1"` and all
structural rules ship salted (`.vsg.vc1 .vsg-seg { … }`), so host-page
design systems can't override it — while the `--vsg-*` variable overrides
above keep working (var definitions are deliberately unsalted). Custom
token: `Segmented.salt = 'acme'` before the first instance; disable with
`Segmented.salt = false`.

## Headless

```js
Segmented.defaults.styles = false   // or per instance: { styles: false }
```

You keep the full behavior (thumb measurement, roving tabindex, ARIA,
hidden input) and the markup contract below — style it entirely from your
own CSS. Our stylesheet is available as a starting point: `Segmented.css`
(string) or [`dist/segmented.css`](../dist/segmented.css) (file).

```
.vsg[.vsg-sm][.vsg-full][.vsg-disabled][data-theme=dark]   role=radiogroup
  .vsg-thumb[.vsg-thumb-on]        ← JS sets transform/width/height
  .vsg-seg[aria-checked]           ← role=radio button, data-value
    .vsg-icon                      ← only when `icon` given
    .vsg-label                     ← omitted when icon-only
  input[type=hidden]               ← only when `name` given
```

## License

MIT
