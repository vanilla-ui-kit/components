# Vanilla UI Kit Select

A single-file, zero-dependency styleable replacement for `<select>` in
vanilla JavaScript. One `<script>` tag, one line of JS. Single and multiple
selection, search, tags, option groups — while the native element stays in
the DOM so forms keep working. Follows your page's light/dark theme
automatically, in the same visual family as
[Vanilla UI Kit DatePicker](../datepicker/README.md) and
[Toast](../toast/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/select/select.js"></script>

<select id="fruit" name="fruit">
  <option value="">Choose a fruit…</option>
  <option value="apple">Apple</option>
  <option value="pear">Pear</option>
</select>
<script>new Select('#fruit', { searchable: true })</script>
```

Or zero-JS with data attributes:

```html
<select data-vsel data-vsel-searchable data-vsel-clearable>…</select>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/select`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
var sel = new Select(target, {
  // target: a native <select> (options read from it, element kept + synced)
  //         or any container element (options come from `options` below)
  options: [                     // container mode only
    { value: 'ams', label: 'Amsterdam', group: 'Europe' },
    { value: 'zrh', label: 'Zürich', group: 'Europe', disabled: true },
    'plain string shorthand'
  ],
  value: null,                   // initial value; string or array (multiple)
  multiple: false,               // defaults to the native select's `multiple`
  searchable: false,             // filter input at the top of the panel
  clearable: false,              // ✕ button that resets the selection
  placeholder: 'Select…',
  name: 'city',                  // form field name (container mode)
  maxItems: null,                // cap for multiple selection
  noResultsText: 'No results',
  disabled: false,
  theme: 'auto',                 // 'auto' | 'light' | 'dark'
  styles: true,                  // false = headless (no CSS injected)
  position: 'auto',              // 'auto' | 'below' | 'above'
  labels: { remove: 'Remove', clear: 'Clear selection',
            search: 'Search', options: 'Options' },
  onChange: function (value, select) {},
  onOpen: function (select) {},
  onClose: function (select) {}
})

sel.getValue()                   // string|null (single), array (multiple)
sel.setValue('pear')             // fires onChange; { silent: true } to skip
sel.open() / sel.close() / sel.toggle()
sel.enable() / sel.disable()
sel.refresh()                    // re-read options from the native <select>
sel.destroy()                    // tear down, restore the native select

Select.create(target, opts)      // same as `new Select(…)`
Select.get(el)                   // instance for an element, or null
Select.autoInit(root)            // activate every [data-vsel] under root
Select.defaults.placeholder = '…'  // change any default once
```

The instance also emits DOM events on the target element: `select:change`
(detail `{ value, select }`), `select:open`, `select:close`.

### Data attributes

Any `[data-vsel]` element is auto-initialized on load. Modifiers:

| Attribute | Maps to |
| --- | --- |
| `data-vsel-searchable` | `searchable: true` (`="false"` to disable) |
| `data-vsel-clearable` | `clearable` |
| `data-vsel-multiple` | `multiple` (container mode) |
| `data-vsel-placeholder="…"` | `placeholder` |
| `data-vsel-name="…"` | `name` (container mode) |
| `data-vsel-value="a"` / `"a,b"` | `value` |
| `data-vsel-max-items="3"` | `maxItems` |
| `data-vsel-no-results="…"` | `noResultsText` |
| `data-vsel-options='["a","b"]'` | `options` (JSON or comma list) |
| `data-vsel-theme`, `data-vsel-position`, `data-vsel-styles` | as named |

## Keyboard

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `↓` / `↑` / `Alt+↓` | open the list (when closed) |
| `↓` / `↑` | move the active option — skips disabled, wraps |
| `Home` / `End` | first / last option (moves the caret instead while typing in the search field) |
| `Enter` | select the active option (closes in single mode) |
| `Esc` | close, return focus to the control |
| `Tab` | close and move on |
| `a`, `b`, `c`… | typeahead by first letters (when not searchable) |
| `Backspace` | multiple mode, empty search: remove the last tag |

## Forms

**Native `<select>` target** — the element is hidden but stays in the DOM.
Every selection is mirrored back (`selected` flags / `selectedIndex`) and a
bubbling `change` event is dispatched, so form submission, validation and
existing listeners keep working untouched. A leading empty-value option is
treated as the placeholder (its label is adopted, and `clear()` re-selects
it). Mutate the options in the DOM and call `refresh()` to re-read them.
`destroy()` restores the native element exactly as it was.

**Container target** — pass `name` and the widget maintains a hidden
`<input type="hidden">` (single) or hidden `<select multiple>` (multiple)
inside itself, so it submits like any form field.

`disable()`/`enable()` also toggle the native element's `disabled`, keeping
submit semantics native.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vsel {
  --vsel-accent: #b45309;  /* focus ring, checkmarks, selected, tags */
  --vsel-bg: …; --vsel-surface: …; --vsel-text: …;
  --vsel-muted: …; --vsel-faint: …; --vsel-shadow: …;
  --vsel-radius: 12px;     /* panel radius */
  --vsel-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes selects
and every other family component in one call; the core also provides shared
popup positioning and style injection.

**CSS isolation:** the control and panel render as `class="vsel vc1"` and
all structural rules ship salted (`.vsel.vc1 .vsel-option { … }`), so
host-page design systems can't override the widget — while the `--vsel-*`
variable overrides above keep working (var definitions are deliberately
unsalted). Custom token: `Select.salt = 'acme'` before the first instance;
disable with `Select.salt = false`.

## Headless

```js
Select.defaults.styles = false   // never inject CSS
```

You keep the full behavior (selection, search, keyboard, ARIA, form sync)
and the markup contract below — style it entirely from your own CSS. Our
stylesheet is available as a starting point: `Select.css` (string) or
[`dist/select.css`](../dist/select.css) (file).

```
.vsel[data-theme=dark].is-open.is-disabled     ← control root (wrapper)
  .vsel-control[role=combobox]
    .vsel-tags > .vsel-tag > .vsel-tag-label + .vsel-tag-x   (multiple)
    .vsel-value.is-placeholder
    .vsel-clear                                (when clearable)
    .vsel-arrow
.vsel.vsel-panel.vsel-open.is-empty            ← panel root (in <body>)
  .vsel-search > input                         (when searchable)
  .vsel-list[role=listbox]
    [role=group] > .vsel-group-label
      .vsel-option.is-active.is-selected.is-disabled
        .vsel-check + .vsel-option-label
  .vsel-empty
```

## Accessibility

- WAI-ARIA combobox pattern: the control is `role="combobox"` with
  `aria-expanded`, `aria-controls` and `aria-activedescendant`; the panel is
  a `role="listbox"` of `role="option"` items (`aria-selected`,
  `aria-disabled`), groups are `role="group"` with `aria-label`,
  `aria-multiselectable` in multiple mode.
- Focus stays on the control (or the search field) while `↑`/`↓` move the
  active option — screen readers follow via `aria-activedescendant`.
- The accessible name is borrowed from a `<label for="…">` pointing at the
  native select; in container mode set `aria-label` on the container or use
  `labels`.
- Option labels are rendered with `textContent`; `html: true` per option is
  an explicit opt-in for trusted markup.
- `:focus-visible` outlines only, `prefers-reduced-motion` respected.

## License

MIT
