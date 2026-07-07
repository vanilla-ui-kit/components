# Vanilla UI Kit Modal

A single-file, zero-dependency modal dialog for vanilla JavaScript. Built on
the native `<dialog>` element (top layer, real inertness) with a transparent
fallback for older browsers. Follows your page's light/dark theme
automatically, in the same visual family as
[Vanilla UI Kit Toast](../toast/README.md) and
[DatePicker](../datepicker/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/modal/modal.js"></script>
<script>
  Modal.confirm('Delete this file?').then(function (ok) {
    if (ok) remove()
  })
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/modal`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM — `open()` returns a dummy handle,
the promise helpers resolve immediately).

## API

### `Modal.open(opts)` → handle

```js
var h = Modal.open({
  title: 'Rename project',
  content: 'Pick a new name below.',   // string | DOM element | HTML string
  size: 'md',                          // 'sm' | 'md' | 'lg' | 'full'
  dismissible: true,                   // Esc, backdrop click, ✕ button
  buttons: [
    { label: 'Cancel' },
    { label: 'Save', variant: 'primary', onClick: function (h) {
        if (!valid()) return false     // return false → stays open
      }, close: 'saved' }              // value passed to onClose
  ],
  onOpen:  function (h) {},
  onClose: function (result) {}
})
// → handle: { el, close(result), update(opts) }
```

- `content` strings are rendered as **text** (`textContent`); pass
  `html: true` to opt in to trusted markup.
- `content` may be a DOM element: it is adopted into the dialog and put
  back exactly where it came from on close (`hidden` / `display:none`
  restored too).
- Multiple modals may be open at once; body scroll stays locked until the
  last one closes.

### Promise helpers

```js
Modal.alert('Saved!')                          // → Promise<void>
Modal.alert({ title: 'Done', message: 'Saved!' })

Modal.confirm('Delete this file?')             // → Promise<boolean>
Modal.confirm({
  title: 'Delete file',
  message: 'This cannot be undone.',
  danger: true                                 // red confirm button
})
// true ONLY on the explicit confirm — Esc / backdrop / ✕ resolve false

Modal.prompt({                                 // → Promise<string|null>
  title: 'Rename',
  message: 'New name:',
  value: 'untitled.txt',
  placeholder: 'File name',
  required: true                               // OK/Enter refuse an empty value
})
// input auto-focused, Enter submits; null on cancel/Esc/backdrop
```

Button captions come from `Modal.defaults.labels` (`{ ok, cancel, close }`) —
override globally or per call via `labels: {…}`.

### Enhance existing markup

```html
<div id="terms" hidden data-vmd-title="Terms of Service">
  …any markup…
  <button data-vmd-close>Got it</button>
</div>
<script>
  var terms = new Modal('#terms', { size: 'lg' })
  terms.open()      // adopts the element; puts it back (re-hidden) on close
  terms.close()
  terms.isOpen()
</script>
```

### Declarative

```html
<button data-vmd-open="#terms">Show terms</button>
```

`Modal.autoInit(root?)` wires every `[data-vmd-open="selector"]` trigger
(runs automatically on `DOMContentLoaded`, and via `VC.autoInit()` when the
core is loaded). Any `[data-vmd-close]` element inside a modal closes it.
The target element may carry `data-vmd-title`, `data-vmd-size`, and
`data-vmd-dismissible="false"`.

## Options

| Option        | Default   | Description                                              |
| ------------- | --------- | -------------------------------------------------------- |
| `title`       | —         | Heading text (rendered with `textContent`)               |
| `content`     | —         | String, DOM element, or HTML string with `html: true`    |
| `html`        | `false`   | Opt-in to render string content as trusted markup        |
| `buttons`     | —         | `[{ label, variant: 'primary'\|'default'\|'danger', onClick(h), close }]` |
| `size`        | `'md'`    | `'sm'` 360px · `'md'` 480px · `'lg'` 720px · `'full'`    |
| `dismissible` | `true`    | Allow Esc, backdrop click, and the ✕ button              |
| `onOpen`      | —         | `fn(handle)` after the dialog is shown                   |
| `onClose`     | —         | `fn(result)` — result is the closing button's `close` value, else `undefined` |
| `theme`       | `'auto'`  | `'auto' \| 'light' \| 'dark'` (per call or via defaults) |
| `styles`      | `true`    | `false` = headless, no CSS injected                      |
| `labels`      | `{ok,cancel,close,dialog}` | Overridable UI strings                  |
| `ariaLabel`   | —         | Accessible name when there is no `title`                 |
| `opener`      | —         | Element to return focus to (defaults to `activeElement`) |

Change any default once: `Modal.defaults.size = 'lg'`.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin it with `Modal.defaults.theme = 'dark'`.

All colors are CSS custom properties:

```css
.vmd {
  --vmd-accent: #b45309;    /* primary buttons, focus rings */
  --vmd-danger: …;          /* danger buttons */
  --vmd-bg: …; --vmd-text: …; --vmd-muted: …; --vmd-faint: …;
  --vmd-backdrop: rgba(20,21,26,.45);
  --vmd-radius: 14px; --vmd-font: …; --vmd-shadow: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes modals
and every other family component in one call.

**CSS isolation:** dialogs render as `class="vmd vc1"` and all structural
rules ship salted (`.vmd.vc1 .vmd-panel { … }`), so host-page design systems
can't override them — while the `--vmd-*` variable overrides above keep
working (var definitions are deliberately unsalted). Custom token:
`Modal.salt = 'acme'` before the first modal; disable with
`Modal.salt = false`.

## Headless

```js
Modal.defaults.styles = false   // never inject CSS
```

You keep the full behavior (native `<dialog>`/fallback, focus management,
scroll lock, promises, ARIA) and the markup contract below — style it
entirely from your own CSS. Our stylesheet is available as a starting
point: `Modal.css` (string) or [`dist/modal.css`](../dist/modal.css) (file).

```
dialog.vmd.vmd-md.vmd-has-title[data-theme=dark]   ← <div role=dialog> fallback
  .vmd-panel
    .vmd-head
      .vmd-title                ← only when `title` given (else .vmd-head-spacer)
      .vmd-x                    ← only when dismissible
    .vmd-body
      .vmd-msg                  ← string content
      .vmd-input                ← Modal.prompt
    .vmd-foot                   ← only when `buttons` given
      .vmd-btn.vmd-btn-primary  ← or .vmd-btn-danger / plain .vmd-btn
```

## Accessibility

- Native `<dialog>` + `showModal()` where supported: real top layer, the
  rest of the page is inert, Esc arrives as a cancelable `cancel` event.
  Fallback: `role="dialog"` overlay with a manual Tab trap and Esc handler.
- `aria-modal="true"`, `aria-labelledby` pointing at the title (or
  `aria-label` when there is none).
- Focus moves into the dialog on open — `[autofocus]` first, then the
  body's first field, then the primary button — and **returns to the
  opener** on close.
- `Esc` closes only when `dismissible` (prevented cleanly on the native
  path so the exit animation still plays).
- `:focus-visible` outlines on every control; animations are disabled
  under `prefers-reduced-motion: reduce`.
- All UI strings are overridable via `defaults.labels` for localisation.

## License

MIT
