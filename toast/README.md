# VanillaToast

A single-file, zero-dependency toast/notification stack for vanilla
JavaScript. One `<script>` tag, one line of JS. Follows your page's
light/dark theme automatically, in the same visual family as
[VanillaDatePicker](../datepicker/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/abdallahk/vanilla-components/toast/toast.js"></script>
<script>
  Toast.success('Saved')
  Toast.error('Something broke', { title: 'Upload failed' })
</script>
```

Also available via the family bundle (`dist/vanilla-components.js`), npm
(`vanilla-components/toast`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
Toast.show('Message', {
  type: 'info',              // 'info' | 'success' | 'error' | 'warning' | 'loading'
  title: 'Optional title',
  duration: 4000,            // ms; 0 = sticky until dismissed
  position: 'bottom-right',  // top|bottom - left|center|right
  dismissible: true,         // show the × button
  action: { label: 'Undo', onClick: (t) => {} },   // one action button
  html: false,               // message is TEXT by default; opt in for markup
  onDismiss: (t) => {},
  max: 5,                    // per-stack cap; oldest evicted beyond it
  styles: true               // false = headless (no CSS injected)
})
// → handle: { el, dismiss(), update(message, opts) }

Toast.info / .success / .error / .warning / .loading   // type shorthands
Toast.dismissAll()
Toast.defaults.position = 'top-center'                 // change any default once
```

**Promises** — a loading toast that resolves into success or error:

```js
Toast.promise(saveUser(), {
  loading: 'Saving…',
  success: (user) => `Saved ${user.name}`,
  error:   (err)  => `Failed: ${err.message}`
})
```

## Behavior

- One stack per position; the newest toast sits nearest the screen edge.
- Hovering a stack pauses **all** of its timers; they resume with the time
  they had left (minimum 400 ms so nothing vanishes mid-read).
- Beyond `max` (default 5) the oldest toast is evicted.
- Errors/warnings use `role="alert"` (assertive); info/success use
  `role="status"` (polite). Reduced motion is respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin it with `Toast.defaults.theme = 'dark'`.

All colors are CSS custom properties:

```css
.vt {
  --vt-accent: #b45309;   /* info icon, action button */
  --vt-success: …; --vt-error: …; --vt-warning: …;
  --vt-bg: …; --vt-text: …; --vt-muted: …; --vt-faint: …;
  --vt-radius: 12px; --vt-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes toasts
and every other family component in one call.

## Headless

```js
Toast.defaults.styles = false   // never inject CSS
```

You keep the full behavior (stacking, timers, pause-on-hover, ARIA) and the
markup contract below — style it entirely from your own CSS. Our stylesheet
is available as a starting point: `Toast.css` (string) or
[`dist/toast.css`](../dist/toast.css) (file).

```
.vt-stack[data-pos="bottom-right"][data-theme="dark"]
  .vt.vt-success.vt-in            ← .vt-out while leaving
    .vt-icon                      ← inline SVG
    .vt-body
      .vt-title                   ← only when `title` given
      .vt-msg
    .vt-action                    ← only when `action` given
    .vt-close                     ← only when dismissible
```

## License

MIT
