# Vanilla UI Kit Form

A single-file, zero-dependency reactive form primitive for vanilla
JavaScript. Build a form from a schema or enhance an existing `<form>`,
and get reactive values, validation (sync + async), loading-state
submission, server error mapping, and a built-in honeypot — following
your page's light/dark theme automatically, in the same visual family as
[Vanilla UI Kit Toast](../toast/README.md) and
[Select](../select/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/form/form.js"></script>

<div id="signup"></div>
<script>
  new Form('#signup', {
    fields: [
      { name: 'email',    type: 'email',    label: 'Email',    required: true },
      { name: 'password', type: 'password', label: 'Password', required: true, minlength: 8 }
    ],
    successMessage: 'Account created',
    onSubmit: function (values) { return api.signup(values) }  // may return a Promise
  })
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/form`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (`new Form(null, …)` or importing without a DOM
returns an inert no-op handle — and `Form.validators` are pure functions
that work in Node).

## Two modes

**Schema mode** — pass a container and `fields`; the whole form is built
for you (labels, hints, error regions, submit button, honeypot):

```js
var form = new Form('#container', { fields: [...], onSubmit: fn })
```

**Enhance mode** — pass an existing `<form>`; its named controls become
the reactive state, its validation attributes (`required`, `pattern`,
`min`, `max`, `minlength`, `maxlength`, `type="email"|"url"|"number"`)
seed the validators, and honeypot + submission handling are added. If you
give no `onSubmit`/`action` option, the form's own `action`/`method`
attributes are adopted and submitted via fetch as `FormData`
(`encoding: 'form'`). `destroy()` restores the original form untouched.

```js
var form = new Form(document.querySelector('form.contact'))
```

Zero-JS enhancement: `<form data-vfm>` auto-initializes; options via
`data-vfm-validate-on`, `data-vfm-encoding`, `data-vfm-success`,
`data-vfm-min-fill-time`, `data-vfm-honeypot="false"`,
`data-vfm-styles="false"`, `data-vfm-reset`, `data-vfm-theme`, etc.

## Field types (schema mode)

| type | renders | notes |
| --- | --- | --- |
| `text` / `email` / `password` / `number` / `url` / `tel` | `<input>` | `password` gets a show/hide toggle button; `email`/`url`/`number` get format validators |
| `textarea` | `<textarea>` | `rows`, `autoGrow: true` for grow-with-content |
| `checkbox` | checkbox | single boolean value |
| `switch` | styled checkbox | same boolean semantics, toggle look |
| `radio` | radio group | `options` array; rendered in a `<fieldset>` with `<legend>` |
| `select` | `<select>` | `options` array; **family-upgrades** to [Select](../select/README.md) |
| `date` | `<input type=date>` | **family-upgrades** to [DatePicker](../datepicker/README.md) |
| `phone` | `<input type=tel>` | **family-upgrades** to PhoneInput; its `.valid` flag feeds validation |
| `hidden` | `<input type=hidden>` | value included in submissions, no UI |

Field spec: `{ name, type, label, placeholder, hint, value, required,
disabled, options, min, max, minlength, maxlength, pattern, validate,
html }`. `options` accepts `['a', 'b']` or `[{value, label, disabled}]`.
Labels/hints/messages are rendered with `textContent`; `html: true` is a
per-field opt-in for **trusted** hint markup only — user values are never
rendered as HTML.

## Reactive state

```js
form.values                       // plain-object snapshot of all fields
form.getValue('email')
form.setValue('email', 'a@b.co')  // + optional {silent: true}
form.setValues({ a: 1 }, { silent: true })

form.errors                       // { name: message } snapshot
form.setError('email', 'Taken')
form.clearErrors()

form.isDirty()                    // any field changed from its initial value
form.isValid()                    // sync validators only, no rendering

var un = form.watch('email', function (value, meta) {})  // meta: {dirty, touched, error}
var un2 = form.watch(function (values, changedName, meta) {})  // any change
un()                              // both return an unsubscribe function

// opts.onChange(values, form) also fires on any change
```

Per-field meta (`dirty`, `touched`) is tracked automatically: `dirty`
compares against the initial value, `touched` is set on first blur.

## Validation

`validateOn: 'blur'` (default) validates a field when it loses focus;
once a field has an error it re-validates **live** on every input so the
message clears the moment the value is fixed. Also: `'change'` (always
live) or `'submit'` (only at submit time). Submit always runs a full
validation pass and focuses the first invalid field.

Built-ins come from the field spec: `required`, email/url format, number
`min`/`max`, `minlength`/`maxlength`, `pattern`. Custom validators via
`validate` — a function or array of functions:

```js
{ name: 'username', label: 'Username', required: true,
  validate: function (value, values) {
    return /^[a-z0-9_]+$/i.test(value) ? null : 'Letters and numbers only'
  } }
```

Return `null` when valid, a message string when invalid — or a
**Promise** of the same for async checks:

```js
validate: function (value) {
  return fetch('/api/username-taken?u=' + encodeURIComponent(value))
    .then(function (r) { return r.json() })
    .then(function (d) { return d.taken ? 'That username is taken' : null })
}
```

Stale async verdicts are discarded automatically when the value changes
again mid-flight.

The built-ins are exposed as **pure functions** (usable in Node, e.g. to
share rules with your server):

```js
Form.validators.email('a@b.co')        // null (valid)
Form.validators.email('nope')          // 'Enter a valid email address'
Form.validators.required(''), .url(v), .number(v, min, max),
Form.validators.length(v, min, max), .pattern(v, re)
```

## Submission

**Callback:** `onSubmit(values, form)` may return a Promise. While it is
pending the submit button is disabled with a spinner and repeat submits
are ignored. Resolve = success: `resetOnSuccess` resets the form, and
`successMessage` is rendered in a polite live region — or shown as
`Toast.success(...)` if the family Toast is on the page. Reject/throw =
error handling below.

**Or let the form fetch for you:**

```js
new Form('#el', {
  fields: [...],
  action: '/api/contact',
  method: 'POST',              // default POST (or the form's method attr)
  encoding: 'json',            // 'json' (default) JSON body | 'form' FormData
  headers: { 'X-CSRF-Token': token }   // CSRF-friendly extra headers
})
```

Non-2xx responses become errors; 2xx resolves with the parsed JSON body.
An `XMLHttpRequest` fallback is used when `fetch` is missing. Native
constraint popups are suppressed (`novalidate`) in favor of the kit's
rendering.

### Server error contract

A rejected submit is mapped like this:

- **`Error`** → form-level error banner (`role="alert"`, focused) with
  its message.
- **`{ field: message }`** or **`{ errors: { field: message } }`** →
  messages distributed to the matching fields, first errored field
  focused. A server **422 JSON response with an `errors` object** is
  handled out of the box:

  ```json
  { "errors": { "email": "Already registered", "name": "Too short" } }
  ```

- **Anything else** → generic form-level message
  (`defaults.labels.submitError`).

`onError(err, form)` fires after rendering for custom handling.

## Honeypot (on by default)

Two traps, zero user impact:

1. **Decoy field** — a text input with a realistic generated name
   (`website_url` style; configurable via `honeypotName`) inside an
   off-viewport wrapper (`position:absolute; left:-9999px` — deliberately
   **not** `display:none`, which cheap bots detect), plus
   `aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`. If it has
   any value at submit time the form **silently "succeeds"**: no
   `onSubmit`, no fetch, the bot sees the normal success UX and learns
   nothing. `onSpam(values)` fires so you can log it.
2. **Time gate** — submits faster than `minFillTime` (default 1500 ms
   after render) are treated the same way.

When submitting via `action`/fetch, a `_hp_t` field carries the
elapsed milliseconds so your server can double-check.

> **Server-side caveat:** client-side honeypots deter *dumb* bots only.
> A headless browser that waits and skips off-screen fields walks right
> past both traps. Always validate and rate-limit on the server; treat
> `_hp_t` as a hint, not proof.

Disable with `honeypot: false`.

## Family upgrades

`select`, `date`, and `phone` fields render as native controls, but when
`window.Select` / `window.DatePicker` / `window.PhoneInput` exist
(standalone or via `window.VC.components`) the field automatically
upgrades to that component, wired into the form's value and validation
state — Select via `onChange`/`getValue`, DatePicker via its input value
+ `onSelect`, PhoneInput via `onChange` with its `.valid` flag feeding a
phone-format validator. Load order is just script tags:

```html
<script src="../select/select.js"></script>
<script src="../datepicker/datepicker.js"></script>
<script src="form.js"></script>
<!-- select/date fields are now the family widgets; phone stays native -->
```

The components are **never required** — without them you keep fully
working native fields. And if `Toast` is present, `successMessage` is
shown as a toast.

## Instance methods & statics

```js
form.submit()      // programmatic submit → Promise<boolean>
form.validate()    // full pass → Promise<boolean>; {silent: true} skips rendering
form.reset()       // back to initial values, errors cleared
form.enable() / form.disable()
form.destroy()     // enhance mode restores the original form

Form.create(el, opts)   // = new Form(el, opts)
Form.get(el)            // instance for an element, or null
Form.autoInit(rootEl)   // init <form data-vfm> added after page load
Form.validators         // the pure built-ins
Form.defaults           // change any default once, page-wide
```

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved
live. Pin with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vfm {
  --vfm-accent: #b45309;   /* focus rings, submit button, checks */
  --vfm-danger: …; --vfm-success: …;
  --vfm-bg: …; --vfm-text: …; --vfm-muted: …; --vfm-faint: …;
  --vfm-radius: 12px; --vfm-font: …; --vfm-shadow: …;
}
```

Scope per theme with `.vfm[data-theme="dark"] { … }`. With the VC core
loaded, `VC.config({ accent: '#b45309' })` themes forms and every other
family component in one call.

**CSS isolation:** forms render as `class="vfm vc1"` and all structural
rules ship salted (`.vfm.vc1 .vfm-input { … }`), so host-page design
systems can't override the fields — while the `--vfm-*` variable
overrides above keep working (var definitions are deliberately unsalted).
Custom token: `Form.salt = 'acme'` before the first form; disable with
`Form.salt = false`.

## Headless

```js
Form.defaults.styles = false   // never inject CSS
```

You keep the full behavior (reactive state, validation, submission,
honeypot, ARIA) and stable class hooks to style yourself: `.vfm-field`,
`.vfm-label`, `.vfm-hint`, `.vfm-input`, `.vfm-error`, `.vfm-check`,
`.vfm-switch`, `.vfm-fieldset`, `.vfm-option`, `.vfm-inputwrap`,
`.vfm-eye`, `.vfm-banner`, `.vfm-status`, `.vfm-actions`, `.vfm-submit`,
plus state classes `is-invalid`, `is-loading`, `is-disabled`. Our
stylesheet is available as a starting point: `Form.css` (string) or
[`dist/form.css`](../dist/form.css) (file). The honeypot stays hidden
headless too (inline off-viewport styles).

## Accessibility

- Every field gets a real `<label for>`/`id` pair; radio groups use
  `<fieldset>`/`<legend>`.
- Hint and error text are wired via `aria-describedby`; failing fields
  get `aria-invalid="true"`.
- Each field's error region is `aria-live="polite"`; the form-level
  banner is `role="alert"`, focusable, and focused when shown; success
  goes to a polite live region.
- Submit failure focuses the first invalid field; `:focus-visible`
  outlines everywhere; `prefers-reduced-motion` kills all
  transitions/animations (including the spinner).
- The password toggle is a real button with `aria-pressed` and a
  show/hide label; the honeypot is `aria-hidden` and removed from the
  tab order.

## License

MIT
