# Vanilla UI Kit NumberInput

A single-file, zero-dependency formatted numeric/currency input for vanilla
JavaScript. Thousands grouping as you type (caret preserved), commit on
blur/Enter with clamp + precision rounding, prefix/suffix adornments, and
hold-to-repeat steppers. Follows your page's light/dark theme automatically,
in the same visual family as [Vanilla UI Kit Toast](../toast/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/number/number.js"></script>

<input id="price" value="1234.5">
<script>
  new NumberInput('#price', { prefix: '$', precision: 2, min: 0 })
</script>
```

Or zero-JS with data attributes:

```html
<input data-vnum data-prefix="$" data-precision="2" data-min="0">
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/number`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM, pure helpers work in Node).

## API

```js
new NumberInput(target, {
  min: null,            // clamp bounds (applied on commit)
  max: null,
  step: 1,              // ArrowUp/Down + stepper increment
  precision: null,      // decimals; default inferred from step (1 → 0, 0.5 → 1)
  thousands: ',',       // ',' | '.' | ' ' | false
  decimal: '.',         // '.' | ','  (must differ from thousands)
  prefix: '',           // non-editable adornment, e.g. '$'
  suffix: '',           // non-editable adornment, e.g. ' kg'
  steppers: true,       // +/− buttons; hold to repeat (500ms, then 60ms, ×10 after 2s)
  allowNegative: true,  // auto-disabled when min >= 0
  placeholder: null,
  value: null,          // initial value (container mode)
  name: null,           // hidden input carrying the RAW value for forms
  disabled: false,
  theme: 'auto',        // 'auto' | 'light' | 'dark'
  styles: true,         // false = headless (no CSS injected)
  labels: { increment: 'Increase value', decrement: 'Decrease value' },
  onChange: (value) => {},  // committed value|null — on blur/step/Enter
  onInput:  (value) => {}   // live value|null while typing
})
```

`target` is either an existing `<input>` (enhanced in place — type coerced
to `text` + `inputmode=decimal`, everything restored by `destroy()`) or any
container element (the input is built inside it).

Instance methods:

```js
ni.getValue()             // number | null (empty input is null, not 0)
ni.setValue(v, {silent})  // number or string ('1.234,5' ok); clamps + rounds
ni.stepUp() / ni.stepDown()
ni.enable() / ni.disable()
ni.focus()
ni.destroy()              // restores the original input, raw value in .value
NumberInput.get(el)       // instance for an element (or null)
```

Pure statics (Node-friendly, no DOM needed):

```js
NumberInput.parse('$1,234.50')                       // → 1234.5   (null if no digits)
NumberInput.format(1234.5, { precision: 2 })         // → '1,234.50'
NumberInput.format(1234.56, { decimal: ',', thousands: '.', precision: 2 })
                                                     // → '1.234,56'
```

## Formatting rules

- **While focused** the text stays lightly formatted and editable: thousands
  separators are maintained live, with the caret preserved by counting the
  significant characters (digits/decimal/minus) left of it — separators
  never count, so regrouping can't drift the caret.
- **On commit** (blur, Enter, step): parse → clamp to `min`/`max` → round to
  `precision` → display fully formatted. Prefix/suffix render as
  non-editable adornments beside the text, never inside it.
- **Empty input is `null`**, not `0`.
- Keystrokes that can't lead to a valid number are rejected. Both `.` and
  `,` keys insert the configured decimal separator (one only; none on
  integer fields). `-` is allowed only when `allowNegative` and only leading.
- **Paste is sanitized**: `'$1,234.50'` becomes `1234.5`.
- Out-of-range text shows a danger border while typing; the commit clamps it.

## Keyboard + ARIA

| Key | Action |
| --- | --- |
| `ArrowUp` / `ArrowDown` | ± `step` (commits) |
| `Shift` + Arrow | ± 10 × `step` |
| `Enter` | commit (then the form may submit — the hidden field is already synced) |
| `Esc` | revert to the last committed value |

The input is `role="spinbutton"` with `aria-valuemin/max/now` and
`aria-valuetext` (the fully formatted text, e.g. `$1,234.50`). The stepper
buttons are `aria-hidden` and out of the tab order — they duplicate the
arrow keys — but stay fully clickable with hold-to-repeat. Reduced motion
is respected.

## Forms

Give it a `name` (option or attribute) and the submitted value is the RAW
number, never the formatted text:

```html
<form>
  <div id="amount"></div>
  <script>new NumberInput('#amount', { name: 'amount', prefix: '$', precision: 2 })</script>
</form>
<!-- submits amount=1234.5 -->
```

In anchor mode, a `name` on the original input migrates to the hidden raw
carrier for the widget's lifetime (and back on `destroy()`), so the
formatted display text is never what the server sees.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vnum {
  --vnum-accent: #b45309;  /* focus ring, active stepper */
  --vnum-bg: …; --vnum-text: …; --vnum-muted: …; --vnum-faint: …;
  --vnum-danger: …;        /* out-of-range warning border */
  --vnum-radius: 10px; --vnum-font: …; --vnum-shadow: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes this and
every other family component in one call.

**CSS isolation:** the widget renders as `class="vnum vc1"` and all
structural rules ship salted (`.vnum.vc1 .vnum-input { … }`), so host-page
design systems can't override it — while the `--vnum-*` variable overrides
above keep working (var definitions are deliberately unsalted). Custom
token: `NumberInput.salt = 'acme'` before the first instance; disable with
`NumberInput.salt = false`.

## Headless

```js
NumberInput.defaults.styles = false   // never inject CSS
```

You keep the full behavior (formatting, caret math, steppers, ARIA) and the
markup contract below — style it entirely from your own CSS. Our stylesheet
is available as a starting point: `NumberInput.css` (string).

```
.vnum[data-theme=light|dark]          ← .vnum-invalid while out of range,
  .vnum-affix.vnum-prefix               .vnum-disabled when disabled
  .vnum-input                         ← role=spinbutton, inputmode=decimal
  .vnum-affix.vnum-suffix
  .vnum-steps                         ← aria-hidden
    .vnum-btn.vnum-up
    .vnum-btn.vnum-down
  input[type=hidden]                  ← raw value, when `name` given
```

## Auto-init attributes

`data-vnum` (optionally the initial value) plus `data-min`, `data-max`,
`data-step`, `data-precision`, `data-thousands` (`space`/`none` keywords),
`data-decimal`, `data-prefix`, `data-suffix`, `data-steppers`,
`data-allow-negative`, `data-name`, `data-placeholder`, `data-value`,
`data-theme`, `data-styles`, `data-disabled`.

## License

MIT
