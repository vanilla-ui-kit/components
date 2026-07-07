# Vanilla UI Kit Tooltip

A single-file, zero-dependency tooltip **and** popover for vanilla
JavaScript. One `<script>` tag, one attribute — or one line of JS. Follows
your page's light/dark theme automatically, in the same visual family as
[Vanilla UI Kit DatePicker](../datepicker/README.md) and
[Toast](../toast/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/tooltip/tooltip.js"></script>

<!-- zero-JS -->
<button data-vtt="Saves your work" data-vtt-placement="bottom">Save</button>

<!-- or programmatic -->
<script>
  new Tooltip('#save', { content: 'Saves your work' })
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/tooltip`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
var tip = new Tooltip('#save', {          // element or selector
  content: 'Saves your work',             // string | fn(triggerEl) | DOM element
  placement: 'top',                       // flips automatically when out of room
  trigger: 'hover',                       // hover also shows on keyboard focus
  interactive: false                      // true = popover mode
})

tip.show()          // also: hide(), toggle()
tip.update('New text')
tip.destroy()

Tooltip.create('#save', opts)             // constructor alias
Tooltip.get('#save')                      // instance for an element, or null
Tooltip.autoInit(root)                    // activate [data-vtt] under root
Tooltip.defaults.placement = 'bottom'     // change any default once
```

### Options

| Option        | Default            | Description |
| ------------- | ------------------ | ----------- |
| `content`     | `''`               | String, `fn(triggerEl)` (re-resolved on every show), or a DOM element. |
| `placement`   | `'top'`            | `'top' \| 'bottom' \| 'left' \| 'right'`; flips to the opposite side when there is no room, clamps to the viewport. |
| `trigger`     | `'hover'`          | `'hover' \| 'click' \| 'focus' \| 'manual'`. Hover also shows on keyboard focus. `'manual'` binds nothing — drive it with `show()`/`hide()`. |
| `delay`       | `null`             | Number (both ways) or `{ show, hide }` in ms. Hover defaults to `{ show: 80, hide: 120 }`; other triggers to `0`. Focus always shows immediately. |
| `offset`      | `8`                | Gap in px between the trigger and the panel. |
| `arrow`       | `true`             | Render the pointer arrow (it tracks the trigger even when the panel is clamped). |
| `interactive` | `false`            | Popover mode: the panel stays open while the pointer or focus is inside it, and may contain focusable content. |
| `html`        | `false`            | Content is **text** by default (rendered with `textContent`); opt in for trusted markup. |
| `theme`       | `'auto'`           | `'auto' \| 'light' \| 'dark'`. |
| `styles`      | `true`             | `false` = headless, no CSS ever injected. |
| `labels`      | `{ popover: 'Popover' }` | Accessible names; `popover` labels click-trigger panels. |
| `onShow`, `onHide` | `null`        | `fn(tooltip)` callbacks. |

### Declarative

Every `[data-vtt]` element is activated on load (and via
`Tooltip.autoInit(root)` for content added later):

```html
<button data-vtt="Tooltip text"
        data-vtt-placement="right"
        data-vtt-trigger="click"
        data-vtt-interactive>…</button>
```

## Behavior

- Hover tooltips have a small show/hide delay so they don't flicker while
  the pointer crosses the page; `interactive: true` keeps the panel open
  while the pointer (or focus) is inside it.
- Click popovers toggle on click, close on outside click, and close on
  <kbd>Escape</kbd> with focus returned to the trigger.
- <kbd>Escape</kbd> dismisses any visible tooltip.
- The panel repositions on scroll and resize, and joins a native
  `<dialog>`'s top layer when the trigger lives inside one.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin one instance with `{ theme: 'dark' }` or all of them with
`Tooltip.defaults.theme = 'dark'`.

All colors are CSS custom properties:

```css
.vtt {
  --vtt-accent: #b45309;  /* links, focus outlines inside the panel */
  --vtt-bg: …; --vtt-text: …; --vtt-muted: …; --vtt-faint: …;
  --vtt-shadow: …; --vtt-radius: 10px; --vtt-max-width: 280px; --vtt-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes tooltips
and every other family component in one call, and popups position through
the shared `VC.position` engine.

**CSS isolation:** panels render as `class="vtt vc1"` and all structural
rules ship salted (`.vtt.vc1 { … }`), so host-page design systems can't
override them — while the `--vtt-*` variable overrides above keep working
(var definitions are deliberately unsalted). Custom token:
`Tooltip.salt = 'acme'` before the first tooltip; disable with
`Tooltip.salt = false`.

## Headless

```js
Tooltip.defaults.styles = false   // never inject CSS
```

You keep the full behavior (triggers, delays, flipping, ARIA) and the
markup contract below — style it entirely from your own CSS. Our stylesheet
is available as a starting point: `Tooltip.css` (string) or
[`dist/tooltip.css`](../dist/tooltip.css) (file).

```
.vtt.vtt-open[data-placement="top"][data-theme="dark"]
  .vtt-arrow                    ← only when `arrow` (position set inline)
  .vtt-content                  ← your content
```

`.vtt-interactive` is added in popover mode (it re-enables pointer events).

## Accessibility

- Hover/focus tooltips follow the WAI-ARIA tooltip pattern: the panel gets
  `role="tooltip"` and the trigger gets `aria-describedby` while it is
  visible (an existing `aria-describedby` is preserved and restored).
- Click popovers set `aria-expanded` + `aria-controls` on the trigger; the
  panel is a labelled `role="group"` (name via `labels.popover`).
- Hover tooltips also show on keyboard focus, immediately (no delay).
- <kbd>Escape</kbd> hides; click popovers refocus their trigger.
- Focusable content inside interactive panels gets `:focus-visible`
  outlines; `prefers-reduced-motion` disables all animation.

## License

MIT
