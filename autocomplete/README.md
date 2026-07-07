# Vanilla UI Kit Autocomplete

A single-file, zero-dependency free-text typeahead for vanilla JavaScript.
One `<script>` tag, one line of JS. Unlike [Select](../select/README.md),
the input stays **free text** — suggestions assist, they never constrain.
Built for search boxes, mention pickers, and tag fields; follows your
page's light/dark theme automatically, in the same visual family as the
rest of [Vanilla UI Kit](../README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/autocomplete/autocomplete.js"></script>
<input id="q" placeholder="Search fruit…">
<script>
  new Autocomplete('#q', { source: ['Apple', 'Apricot', 'Banana', 'Cherry'] })
</script>
```

Or zero-JS with data attributes:

```html
<input data-vac data-vac-source='["Apple","Apricot","Banana"]'>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/autocomplete`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
var ac = new Autocomplete('#q', {
  source: [...],          // see "Sources" below
  minChars: 1,            // fewer typed chars = closed panel
  debounce: 150,          // ms between last keystroke and the lookup
  maxResults: 10,         // cap applied after the source answers
  highlight: true,        // wrap the matched substring in a <span> (DOM, never innerHTML)
  openOnFocus: false,     // lookup on focus, ignoring minChars — recent-searches lists
  allowNew: true,         // free text stays valid; false reverts unmatched text on blur
  emptyText: null,        // "no results" row; defaults to labels.noResults
  theme: 'auto',          // 'auto' | 'light' | 'dark'
  styles: true,           // false = headless (no CSS injected)
  position: 'auto',       // 'auto' | 'below' | 'above'
  labels: { noResults: 'No results', loading: 'Loading…', suggestions: 'Suggestions' },
  onSelect: (item, ac) => {},   // suggestion committed (Enter or click)
  onInput:  (query, ac) => {},  // every keystroke
  onError:  (err, ac) => {},    // source failure (panel closes silently)
  onOpen:   (ac) => {},
  onClose:  (ac) => {}
})

ac.open()          // look up the current text now (ignores minChars) and show
ac.close()         // close; also cancels any in-flight lookup
ac.setSource(src)  // swap the source; an open panel refreshes in place
ac.getInput()      // the bound <input>
ac.destroy()       // tear down, give the input back exactly as found

Autocomplete.create('#q', {...})   // constructor alias
Autocomplete.get('#q')             // instance already bound to that element
Autocomplete.autoInit(root?)       // init all [data-vac] under root
```

Items can be plain strings or objects:

```js
{ value: 'nz', label: 'New Zealand', group: 'Oceania', disabled: false, html: false }
```

Labels render as **text** via `textContent`; `html: true` is a per-item
opt-in for trusted markup (and skips highlighting).

## Sources

```js
// 1. Array — filtered locally (case/diacritic-insensitive substring)
source: ['Alpha', 'Beta', { value: 'g', label: 'Gamma' }]

// 2. Callback — call done(results) whenever you're ready
source: function (query, done) {
  fetch('/api?q=' + encodeURIComponent(query))
    .then(r => r.json()).then(done)
}

// 3. Promise — return a thenable that resolves to results
source: query => fetch('/api?q=' + encodeURIComponent(query)).then(r => r.json())
```

**Async correctness:** every lookup gets a sequence token. Results arriving
for a query the user has since abandoned are **discarded** — a slow "ap"
response can never overwrite the list for "apple". While a lookup is in
flight, a subtle loading row (`labels.loading`) shows and any previous
results stay visible underneath. A rejected promise / thrown source closes
the panel silently and calls `onError` if given.

## Keyboard

| Key | Behavior |
| --- | --- |
| `↓` / `↑` | Move the active suggestion (wraps, skips disabled). The typed text is **not** changed while browsing — only `aria-activedescendant` moves. `↓` on a closed panel reopens it. |
| `Enter` | Commit the active suggestion: fills the input with `item.value`, fires `onSelect`, closes. With nothing active the free text stands and the event reaches your form. |
| `Esc` | Close the panel (once — the typed text is kept). |
| `Tab` | Close and move on. |
| typing | Reopens with fresh suggestions (debounced). |

ARIA: the input is `role="combobox"` with `aria-autocomplete="list"`,
`aria-expanded`, `aria-controls`; the panel is `role="listbox"` with
`role="option"` items and `role="group"` headers. Reduced motion is
respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vac {
  --vac-accent: #b45309;  /* highlight + active tint */
  --vac-bg: …; --vac-surface: …; --vac-text: …; --vac-muted: …; --vac-faint: …;
  --vac-shadow: …; --vac-radius: 12px; --vac-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes the
autocomplete and every other family component in one call.

**CSS isolation:** the panel renders as `class="vac vac-panel vc1"` and all
structural rules ship salted (`.vac.vc1 .vac-option { … }`), so host-page
design systems can't override it — while the `--vac-*` variable overrides
above keep working (var definitions are deliberately unsalted). Custom
token: `Autocomplete.salt = 'acme'` before the first instance; disable with
`Autocomplete.salt = false`. The host `<input>` itself is never styled —
it stays yours.

## Headless

```js
Autocomplete.defaults.styles = false   // never inject CSS
```

You keep the full behavior (async guards, keyboard, ARIA) and the markup
contract below — style it entirely from your own CSS. Our stylesheet is
available as a starting point: `Autocomplete.css` (string).

```
input[data-vac-bound]                 ← your input, untouched
.vac.vac-panel[data-theme="dark"]     ← .vac-open while visible;
  .vac-list[role="listbox"]             is-loading / is-empty state classes
    [role="group"] > .vac-group-label ← only when items carry `group`
    .vac-option.is-active             ← .vac-match wraps the matched substring
  .vac-loading                        ← spinner row while a lookup is in flight
  .vac-empty                          ← shown when query ≥ minChars, no results
```

## Data attributes

`data-vac` plus any of: `data-vac-source` (JSON array or comma list),
`data-vac-min-chars`, `data-vac-debounce`, `data-vac-max-results`,
`data-vac-highlight`, `data-vac-open-on-focus`, `data-vac-allow-new`,
`data-vac-empty-text`, `data-vac-theme`, `data-vac-styles`,
`data-vac-position`.

## License

MIT
