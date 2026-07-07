# Vanilla UI Kit Rating

A single-file, zero-dependency star rating input and display for vanilla
JavaScript. One `<script>` tag, one line of JS. Follows your page's
light/dark theme automatically, in the same visual family as
[Vanilla UI Kit DatePicker](../datepicker/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/rating/rating.js"></script>

<div id="stars"></div>
<script>
  new Rating('#stars', { onChange: function (v) { console.log(v) } })
</script>
```

Or zero-JS with data attributes:

```html
<div data-vrt data-value="3.5" data-name="score"></div>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/rating`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
new Rating(target, {
  max: 5,               // number of stars
  value: 0,             // initial value (input mode reads the input instead)
  half: true,           // half-star steps on hover/click/keyboard
  icon: 'star',         // 'star' | 'heart' | { empty, full } trusted SVG strings
  size: 22,             // icon size in px
  readOnly: false,      // display mode: no interaction, no focus stop
  clearable: true,      // clicking the current value clears to 0
  name: null,           // adds a hidden input for forms (container mode)
  showValue: false,     // '3.5' text after the stars
  disabled: false,      // starts disabled (input mode inherits the input's)
  labels: (v, max) => `${v} of ${max}`,   // aria-valuetext / read-only label
  theme: 'auto',        // 'auto' | 'light' | 'dark'
  styles: true,         // false = headless (no CSS injected)
  onChange: (v) => {},  // committed value
  onHover: (v) => {}    // preview value while hovering, null on leave
})

rating.getValue()
rating.setValue(4.5)                  // fires onChange when it changed
rating.setValue(4.5, { silent: true })
rating.enable() / rating.disable()
rating.destroy()                      // restores the target completely

Rating.create(target, opts)   Rating.get(target)   Rating.autoInit(root?)
```

`target` is either:

- **a container** — the widget is built inside it; give `name` to get a
  hidden input for form submission, or
- **an existing `<input>`** — it is hidden and kept in sync (so the form
  still submits it, `change` events still fire), and fully restored on
  `destroy()`. Its current value seeds the rating; a `<label for>` pointing
  at it becomes the widget's accessible name.

The submitted value is the number as text (`"3.5"`), or the empty string
when the rating is 0/cleared.

## Behavior

- **Hover** previews the fill (left half of a star = .5 when `half`); the
  committed value returns on mouse-leave. **Click** commits; clicking the
  value that is already committed clears to 0 (`clearable`).
- **Keyboard** — the whole group is a single tab stop with `role="slider"`:
  ArrowRight/ArrowUp +step, ArrowLeft/ArrowDown −step (step = `half` ? 0.5
  : 1), Home = 0, End = max, number keys 1–9 jump straight to that value.
  `aria-valuetext` reads "3.5 of 5" (customize via `labels`).
- **Any fraction renders** — each star's fill is a clipped overlay whose
  width is a percentage, so `setValue(4.3)` (or a read-only average) shows
  four full stars and a 30% fifth. Interaction still snaps to steps.
- `readOnly` renders `role="img"` with the `labels` text and takes no
  focus; `disable()` keeps the slider in the tab order out (`tabindex=-1`,
  `aria-disabled`). Reduced motion is respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties. Rating is the one family component
with a non-accent fill color — a warm star gold — themeable separately:

```css
.vrt {
  --vrt-fill: #f5a623;    /* the star fill (gold; dark theme: #f7b84d) */
  --vrt-accent: #5b5bd6;  /* focus ring */
  --vrt-text: …; --vrt-muted: …; --vrt-faint: …;
  --vrt-radius: 8px; --vrt-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes the
focus ring and every other family component in one call (the gold fill
stays put unless you override `--vrt-fill`).

**CSS isolation:** widgets render as `class="vrt vc1"` and all structural
rules ship salted (`.vrt.vc1 .vrt-star { … }`), so host-page design systems
can't override them — while the `--vrt-*` variable overrides above keep
working (var definitions are deliberately unsalted). Custom token:
`Rating.salt = 'acme'` before the first instance; disable with
`Rating.salt = false`.

## Headless

```js
Rating.defaults.styles = false   // never inject CSS (or per instance)
```

You keep the full behavior (hover preview, keyboard, ARIA, form sync) and
the markup contract below — style it entirely from your own CSS. Our
stylesheet is available as a starting point: `Rating.css` (string).

```
.vrt[data-theme=dark].vrt-readonly.vrt-disabled
  .vrt-stars[role=slider|img]      ← .vrt-static when non-interactive
    .vrt-star                      ← × max, sized inline
      .vrt-star-empty              ← outline SVG
      .vrt-star-fill               ← overlay clipped to N% width
        .vrt-star-full             ← filled SVG, fixed width
  .vrt-value                       ← only when showValue
  input[type=hidden]               ← only when name given (container mode)
```

## License

MIT
