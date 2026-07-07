# Vanilla UI Kit Progress

A single-file, zero-dependency set of loading primitives — progress **bars**,
**spinners** and **skeletons** — for vanilla JavaScript. One `<script>` tag,
one line of JS. Follows your page's light/dark theme automatically, in the
same visual family as [Vanilla UI Kit Toast](../toast/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/progress/progress.js"></script>
<script>
  var bar = Progress.bar('#upload', { label: 'Uploading…', showValue: true })
  bar.set(42)
  bar.done()          // fills to 100% in the success color
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/progress`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (every call returns an inert handle without a DOM).

## API

### Bars

```js
Progress.bar(target, {        // target: element or selector; bar is appended into it
  value: 0,                   // starting value
  max: 100,
  indeterminate: false,       // sweeping animation; aria-valuenow omitted
  label: 'Uploading…',        // visible text above the bar (always plain text)
  showValue: false,           // '42%' at the right of the label row
  size: 'md',                 // 'sm' | 'md'
  color: 'accent',            // 'accent' | 'success'
  autoRemove: false,          // done(): true → remove after 800ms; number → custom ms
  styles: true                // false = headless (no CSS injected)
})
// → handle: { el, set(value), done(), setLabel(text), remove() }
```

- `set(value)` clamps to `[0, max]` and, on an indeterminate bar, promotes it
  to determinate.
- `done()` fills to 100% in the success color, then removes the bar if
  `autoRemove` is set.

### Spinners

```js
Progress.spinner(target, {
  size: 20,                   // px (also accepts spinnerSize)
  label: 'Loading…',          // visually-hidden accessible text
  inline: true                // false renders as a block
})
// → handle: { el, remove() }
```

An SVG arc — the same arc as Toast's loading icon — spinning in the accent
color.

### Skeletons

```js
var sk = Progress.skeleton(target, {
  lines: 3,
  avatar: false,              // leading 40px circle
  header: false,              // taller first line
  widths: ['100%','85%','60%'], // per-line CSS widths; default staggered
  height: 12                  // px per line
})
sk.release()                  // or the static form:
Progress.skeleton.release(target)
```

Shimmering placeholder blocks rendered **inside** `target`. The original
children are hidden (inline `display:none`), never removed — `release()`
restores each one's exact prior inline display. Calling `skeleton()` twice on
the same target returns the existing handle.

### Declarative

```html
<div data-vpg="bar" data-vpg-value="30" data-vpg-label="Importing" data-vpg-show-value></div>
<span data-vpg="spinner" data-vpg-size="16"></span>
<div data-vpg="skeleton" data-vpg-lines="4" data-vpg-avatar></div>
```

Initialized on `DOMContentLoaded` (or call `Progress.autoInit(root)` /
`VC.autoInit()` after inserting markup). Modifiers: `data-vpg-value`, `-max`,
`-label`, `-show-value`, `-indeterminate`, `-size`, `-color`, `-inline`,
`-lines`, `-avatar`, `-header`, `-height`, `-widths` (comma-separated),
`-theme`.

## Accessibility

- Bars: `role="progressbar"` with `aria-valuemin/max/now` and an `aria-label`
  (the label text, or "Loading…"). `aria-valuenow` is **omitted** while
  indeterminate, per the ARIA spec.
- Spinners: `role="status"` with visually-hidden text (`.vpg-sr`), announced
  politely.
- Skeletons: `aria-hidden="true"` — the target gets `aria-busy="true"`
  instead, cleared on `release()`.
- **Reduced motion:** shimmer, indeterminate sweep and the spinner rotation
  are all replaced by calm states — the sweep becomes a full-width bar, and
  activity is shown with a slow opacity pulse instead of movement.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin it with `Progress.defaults.theme = 'dark'`.

All colors are CSS custom properties:

```css
.vpg {
  --vpg-accent: #b45309;   /* bar fill, spinner */
  --vpg-success: …;        /* done() fill */
  --vpg-bg: …; --vpg-text: …; --vpg-muted: …;
  --vpg-faint: …;          /* track + skeleton base */
  --vpg-shimmer: …;        /* skeleton highlight */
  --vpg-radius: 12px; --vpg-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes progress
and every other family component in one call.

**CSS isolation:** roots render as `class="vpg vpg-bar vc1"` and all
structural rules ship salted (`.vpg.vc1 .vpg-track { … }`), so host-page
design systems can't override the widgets — while the `--vpg-*` variable
overrides above keep working (var definitions are deliberately unsalted).
Custom token: `Progress.salt = 'acme'` before the first render; disable with
`Progress.salt = false`.

## Headless

```js
Progress.defaults.styles = false   // never inject CSS
```

You keep the full behavior (values, ARIA, hide/restore) and the markup
contract below — style it entirely from your own CSS. Our stylesheet is
available as a starting point: `Progress.css` (string).

```
.vpg.vpg-bar[.vpg-sm][.vpg-success][.vpg-ind][data-theme=dark]
  .vpg-top                        ← only when label/showValue
    .vpg-labeltext
    .vpg-value                    ← only when showValue
  .vpg-track[role=progressbar]
    .vpg-fill

.vpg.vpg-spinner[.vpg-block][role=status]
  svg.vpg-spin
  .vpg-sr                         ← visually-hidden label

.vpg.vpg-skeleton[aria-hidden]
  .vpg-avatar                     ← only when avatar
  .vpg-lines
    .vpg-line[.vpg-head]          ← .vpg-head on header first line
```

## License

MIT
