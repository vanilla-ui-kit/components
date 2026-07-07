# Vanilla UI Kit Popconfirm

A single-file, zero-dependency inline confirmation popover for vanilla
JavaScript — "Are you sure?" anchored to the button that asked, lighter
than a modal. One `<script>` tag, one line of JS. Follows your page's
light/dark theme automatically, in the same visual family as
[Vanilla UI Kit Tooltip](../tooltip/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/popconfirm/popconfirm.js"></script>

<!-- declarative: intercepts the click until confirmed -->
<button data-vpc="Delete this file?" data-vpc-danger data-vpc-ok="Delete">
  Delete
</button>

<script>
  // or promise-based, anchored to any element:
  const ok = await Popconfirm.ask('#delete-btn', 'Delete this file?')
  if (ok) remove()
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/popconfirm`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (`ask()` resolves `false` without a DOM — the safe
answer to "are you sure?").

## API

**One-shot** — anchor a confirm to an element, get a `Promise<boolean>`:

```js
const ok = await Popconfirm.ask(el /* or selector */, {
  message: 'Delete this file?',   // or pass a plain string instead of opts
  title: 'Optional bold line',
  okLabel: 'Delete',              // defaults to labels.ok ('OK')
  cancelLabel: 'Keep it',         // defaults to labels.cancel ('Cancel')
  danger: true,                   // red OK button + red icon
  placement: 'top',               // top | bottom | left | right (auto-flips)
  icon: true,                     // false = none; string = custom trusted markup
  width: 260,                     // px number or CSS length; default fits content
  html: false,                    // message is TEXT by default; opt in for markup
  styles: true                    // false = headless (no CSS injected)
})
```

**Persistent binding** — intercepts the element's click until confirmed:

```js
const pc = new Popconfirm('#delete-btn', {
  message: 'Delete this file?',
  danger: true,
  onConfirm: (el) => {},   // after OK; the original click also proceeds
  onCancel: () => {}
})
pc.show(); pc.hide(); pc.destroy()   // destroy() unbinds the interceptor
```

**Declarative** — auto-bound at load (and via `Popconfirm.autoInit(root)`):

```html
<button data-vpc="Publish now?"
        data-vpc-title="Publish"
        data-vpc-ok="Publish" data-vpc-cancel="Not yet"
        data-vpc-danger="false"
        data-vpc-placement="bottom"
        data-vpc-icon="false">Publish</button>
```

`Popconfirm.get(el)` returns the bound instance;
`Popconfirm.defaults.labels = { ok: 'Yes', cancel: 'No' }` relabels every
popconfirm once (e.g. for localization).

## Behavior

- **Interception.** Bound triggers are intercepted by one document-level
  *capture* listener, so the original click — form submit, link navigation,
  handlers registered before Popconfirm, even inline `onclick` — is frozen
  until confirmed. On confirm, the click is re-dispatched with a one-shot
  re-entrancy guard so the interceptor lets it through exactly once (no
  loops). Submit buttons submit their form explicitly via
  `form.requestSubmit(trigger)` (validation + `submit` event + the button's
  name/value), with `form.submit()` as the legacy fallback, since synthetic
  clicks don't reliably submit forms.
- **Focus.** Opens with focus on **Cancel** — the safe default, so a
  reflexive Enter dismisses instead of confirming. Tab/Shift+Tab cycle the
  two buttons; Enter/Space activate the focused one; Escape or a click
  outside cancels. The trigger is refocused on close.
- **One at a time.** Opening a popconfirm settles any other open one as a
  cancel. Clicking an open popconfirm's own trigger toggles it shut.
- **Panel.** `role="alertdialog"` with the message as its accessible name,
  tooltip-style anchored positioning with auto-flip, viewport clamping, and
  an arrow that stays pointed at the trigger. Reduced motion is respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per call with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vpc {
  --vpc-accent: #b45309;   /* OK button */
  --vpc-danger: …;         /* danger OK button + icon */
  --vpc-warning: …;        /* default icon */
  --vpc-bg: …; --vpc-text: …; --vpc-muted: …; --vpc-faint: …;
  --vpc-radius: 12px; --vpc-font: …; --vpc-shadow: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes
popconfirms and every other family component in one call.

**CSS isolation:** panels render as `class="vpc vc1"` and all structural
rules ship salted (`.vpc.vc1 .vpc-btn { … }`), so host-page design systems
can't override them — while the `--vpc-*` variable overrides above keep
working (var definitions are deliberately unsalted). Custom token:
`Popconfirm.salt = 'acme'` before the first popconfirm; disable with
`Popconfirm.salt = false`.

## Headless

```js
Popconfirm.defaults.styles = false   // never inject CSS
```

You keep the full behavior (interception, focus management, ARIA,
positioning) and the markup contract below — style it entirely from your
own CSS. Our stylesheet is available as a starting point: `Popconfirm.css`
(string).

```
.vpc.vpc-danger[data-theme="dark"][data-placement="top"].vpc-open
  .vpc-arrow
  .vpc-body
    .vpc-icon                     ← unless icon: false
    .vpc-content
      .vpc-title                  ← only when `title` given
      .vpc-msg
  .vpc-actions
    .vpc-btn.vpc-cancel
    .vpc-btn.vpc-ok
```

## License

MIT
