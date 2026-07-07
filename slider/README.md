# Vanilla UI Kit Slider

A single-file, zero-dependency range slider for vanilla JavaScript —
single or dual thumb, marks, tooltips, vertical, form-friendly. One
`<script>` tag, one line of JS. Follows your page's light/dark theme
automatically, in the same visual family as
[Vanilla UI Kit DatePicker](../datepicker/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/slider/slider.js"></script>

<div id="volume"></div>
<script>
  new Slider('#volume', { value: 40, suffix: '%' })
</script>
```

Or replace a native range input — it is hidden and kept synced, so plain
form posts keep working:

```html
<input type="range" name="volume" min="0" max="100" value="40">
<script>new Slider(document.querySelector('[name=volume]'))</script>
```

Or zero-JS: `<div data-vsld data-min="0" data-max="100" data-value="40"></div>`.

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/slider`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (inert instance without a DOM).

## API

```js
var slider = new Slider('#el', {   // container to build in, or an <input> to replace
  min: 0,
  max: 100,
  step: 1,
  value: 40,                // number = single thumb; [20, 80] = dual-thumb range
  marks: false,             // true = tick per step (when ≤ 20 steps)
                            // or { 0: 'Low', 50: 'Mid', 100: 'High' }
  tooltip: 'drag',          // 'drag' (while dragging/focused) | 'always' | false
  format: function (v) { return v + ' GB' },  // tooltip + aria-valuetext
  prefix: '$', suffix: '',  // shorthand when no `format` given
  vertical: false,          // bottom → top; ArrowUp still increases
  disabled: false,
  name: 'price',            // hidden input(s): 'price' single, 'price[]' dual
  theme: 'auto',            // 'auto' | 'light' | 'dark'
  styles: true,             // false = headless (no CSS injected)
  onInput: function (value, slider) {},   // every move
  onChange: function (value, slider) {},  // on release / commit
  labels: { value: 'Value', min: 'Minimum value', max: 'Maximum value' }
})

slider.getValue()               // → 40, or [20, 80] for dual
slider.setValue(60)             // snapped + clamped; fires onInput + onChange
slider.setValue(60, { silent: true })
slider.enable() / slider.disable()
slider.destroy()                // restores a replaced input, removes built DOM

Slider.create(el, opts)         // same as new Slider(...)
Slider.get(el)                  // instance for an element (or null)
Slider.autoInit(root?)          // init every [data-vsld] under root
```

The root element also emits bubbling `slider:input` / `slider:change`
CustomEvents (`event.detail.value`).

## Behavior

- **Pointer** (mouse, touch, pen — Pointer Events with capture): drag a
  thumb, or press anywhere on the track to jump the *nearest* thumb there
  and keep dragging. Thumbs cannot cross — each clamps at its sibling. A
  fill bar spans the range (or from `min` for single).
- **Keyboard**, per thumb: `←`/`↓` −step, `→`/`↑` +step, `PageUp`/`PageDown`
  ±10·step, `Home`/`End` to min/max. Every press commits (fires both
  `onInput` and `onChange`).
- **Forms**: a replaced `<input>` keeps carrying the value (`"20,80"` when
  dual) and receives real `input`/`change` events; with `name` given in
  build mode, hidden input(s) are created instead. Disabled sliders don't
  submit, like native controls.
- **ARIA**: each thumb is `role="slider"` with `aria-valuemin/max/now`,
  formatted `aria-valuetext`, an `aria-label` from `labels`
  (`'Minimum value'`/`'Maximum value'` defaults for dual), and
  `aria-orientation="vertical"` when vertical. Dual thumbs advertise the
  sibling as their live limit. Reduced motion is respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vsld {
  --vsld-accent: #b45309;   /* fill, thumb ring, focus ring */
  --vsld-bg: …; --vsld-text: …; --vsld-muted: …; --vsld-faint: …;
  --vsld-shadow: …; --vsld-radius: 8px; --vsld-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes sliders
and every other family component in one call.

**CSS isolation:** roots render as `class="vsld vc1"` and all structural
rules ship salted (`.vsld.vc1 .vsld-thumb { … }`), so host-page design
systems can't override the slider — while the `--vsld-*` variable overrides
above keep working (var definitions are deliberately unsalted). Custom
token: `Slider.salt = 'acme'` before the first instance; disable with
`Slider.salt = false`.

## Headless

```js
Slider.defaults.styles = false   // never inject CSS
```

You keep the full behavior (pointer capture, clamping, keyboard, ARIA,
form sync) and the markup contract below — style it entirely from your own
CSS. Our stylesheet is available as a starting point: `Slider.css` (string).

```
.vsld.vsld-vertical.vsld-tip-always.vsld-disabled[data-theme=dark]
  .vsld-track                ← the rail (press/drag surface)
    .vsld-fill               ← range fill bar
    .vsld-mark               ← tick; one per step or per `marks` key
      .vsld-mark-label       ← only for object marks
    .vsld-thumb              ← role=slider; .vsld-active while dragging
      .vsld-tip              ← value bubble (absent when tooltip: false)
  input[type=hidden]         ← only when `name` given
```

## License

MIT
